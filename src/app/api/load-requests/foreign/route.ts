import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";

import LoadRequest from "@/models/LoadRequest";
import Product from "@/models/Product";
import ProductInventory from "@/models/ProductInventory";
import CounterLoadRequest from "@/models/CounterLoadRequest";
import { reserveLoadRequestLots } from "@/lib/inventory/reserveLoadRequestLots";

const LOCATIONS = [
  "yuma",
  "tucson",
  "elPaso",
  "lasVegas",
];

const LOCATION_CODES: Record<string, string> = {
  yuma: "YUM",
  tucson: "TUC",
  elPaso: "ELP",
  lasVegas: "LV",
};

export async function POST(req: Request) {
  await connectToDatabase();

    const session =
      await getServerSession(authOptions);

    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      location,
      products,
    } = body;

    if (
      !location ||
      !LOCATIONS.includes(location)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid destination location",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one product is required",
        },
        { status: 400 }
      );
    }
    const mongoSession = await mongoose.startSession();
  try {
    let createdLoadRequest: any;

    await mongoSession.withTransaction(
      async () => {

        const validatedProducts: any[] = [];

        // =====================================
        // VALIDATE + RESERVE
        // =====================================

        for (const item of products) {

          const quantity =
            Number(
              item.requestedQuantity
            );

          if (
            !item.product ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              "Invalid product quantity"
            );
          }

          const product =
            await Product.findById(
              item.product
            ).session(mongoSession);

          if (!product) {
            throw new Error(
              `Product not found: ${item.product}`
            );
          }

          /*
           * Atomic inventory reservation.
           *
           * currentInventory >= quantity is part
           * of the query, so two admins cannot
           * accidentally reserve the same stock.
           */


          const inventory = await ProductInventory.findOne({
            product: item.product,
          }).session(mongoSession);

          if (!inventory) {
            throw new Error(
              `Phoenix inventory not found for ${product.name}`
            );
          }

          if (
            Number(inventory.currentInventory ?? 0) < quantity
          ) {
            throw new Error(
              `Insufficient Phoenix inventory for ${product.name}`
            );
          }

          const allocations = reserveLoadRequestLots(
            inventory,
            quantity
          );

          inventory.currentInventory =
            Number(inventory.currentInventory ?? 0) - quantity;

          inventory.preSavedInventory =
            Number(inventory.preSavedInventory ?? 0) + quantity;

          await inventory.save({ session: mongoSession });

          validatedProducts.push({
            product: item.product,
            requestedQuantity: quantity,
            approvedQuantity: quantity,
            assembledQuantity: 0,
            deliveredQuantity: 0,
            reservedLotAllocations: allocations,
            lotAllocations: [],
          });

        }

        // =====================================
        // COUNTER
        // =====================================

        const counter =
          await CounterLoadRequest.findOneAndUpdate(
            {
              name: "loadRequest",
            },
            {
              $inc: {
                seq: 1,
              },
            },
            {
              new: true,
              upsert: true,
              session: mongoSession,
            }
          );

        const code =
          LOCATION_CODES[location];

        const nextNumber =
          `LR-${code}-${1000 + counter.seq}`;

        // =====================================
        // CREATE LOAD REQUEST
        // =====================================

        const created =
          await LoadRequest.create(
            [
              {
                LRNumber:
                  nextNumber,

                requestType:
                  "foreign",

                destinationLocation:
                  location,

                requestedBy:
                  user.id,

                requestedAt:
                  new Date(),

                reviewedBy:
                  user.id,

                reviewedAt:
                  new Date(),

                products:
                  validatedProducts,

                /*
                 * Admin has already approved it
                 * by creating the transfer.
                 */
                status:
                  "approved",
                lotTrackingVersion: 1,
              },
            ],
            {
              session:
                mongoSession,
            }
          );

        createdLoadRequest =
          created[0];
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Foreign load request created and inventory reserved",

      loadRequest:
        createdLoadRequest,
    });

  } catch (err: any) {

    console.error(
      "CREATE FOREIGN LOAD REQUEST ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          err.message ||
          "Server error",
      },
      {
        status:
          err.message ===
            "Unauthorized"
            ? 401
            : 500,
      }
    );

  } finally {
    await mongoSession.endSession();
  }
}