import { connectToDatabase } from "@/lib/db";

import CreditMemo from "@/models/CreditMemo";

import {
  getInventoryModel,
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";

import mongoose from "mongoose";

import {
  NextResponse,
} from "next/server";


export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  // ==================================================
  // CONNECT FIRST
  // ==================================================

  await connectToDatabase();


  const { id } =
    await context.params;


  // ==================================================
  // THEN CREATE SESSION
  // ==================================================

  const session =
    await mongoose.startSession();


  session.startTransaction();


  try {

    // ==================================================
    // BODY
    // ==================================================

    const body =
      await req.json();


    if (
      !Array.isArray(
        body.products
      )
    ) {

      throw new Error(
        "Products are required"
      );

    }


    // ==================================================
    // CREDIT MEMO
    // ==================================================

    const creditMemo =
      await CreditMemo.findById(
        id
      )

        .populate({
          path:
            "routeAssigned",
        })

        .session(
          session
        );


    if (!creditMemo) {

      await session.abortTransaction();


      return NextResponse.json(
        {
          error:
            "Credit memo not found",
        },
        {
          status: 404,
        }
      );

    }


    // ==================================================
    // STATUS CHECK
    // ==================================================

    if (
      creditMemo.status ===
      "received"
    ) {

      await session.abortTransaction();


      return NextResponse.json(
        {
          error:
            "Credit memo has already been received",
        },
        {
          status: 400,
        }
      );

    }


    if (
      creditMemo.status ===
      "cancelled"
    ) {

      await session.abortTransaction();


      return NextResponse.json(
        {
          error:
            "Cancelled credit memo cannot be received",
        },
        {
          status: 400,
        }
      );

    }


    // ==================================================
    // INVENTORY LOCATION
    // ==================================================

    const inventoryLocation =
      normalizeInventoryLocation(
        creditMemo.inventoryLocation
      );


    const isForeignInventory =
      inventoryLocation !==
      "phoenix";


    const InventoryModel =
      getInventoryModel(
        inventoryLocation
      );


    // ==================================================
    // TOTAL
    // ==================================================

    let calculateTotalCents =
      0;


    // ==================================================
    // PRODUCTS
    // ==================================================

    for (
      const incoming of body.products
    ) {

      const productId =
        typeof incoming.product ===
        "object"
          ? incoming.product?._id
          : incoming.product;


      if (!productId) {

        throw new Error(
          "Invalid product in credit memo"
        );

      }


      // =================================================
      // FIND ORIGINAL CREDIT MEMO LINE
      // =================================================

      const productLine =
        creditMemo.products.find(
          (p: any) =>
            p.product
              .toString() ===
            productId.toString()
        );


      if (!productLine) {

        throw new Error(
          `Product ${productId} does not belong to this credit memo`
        );

      }


      // =================================================
      // RETURNED QUANTITY
      // =================================================

      const returnedQty =
        Math.round(
          Number(
            incoming.pickedQuantity ??
            incoming.returnedQuantity ??
            0
          )
        );


      const expectedQty =
        Math.round(
          Number(
            productLine.quantity ||
            0
          )
        );


      if (
        returnedQty < 0
      ) {

        throw new Error(
          "Returned quantity cannot be negative"
        );

      }


      if (
        returnedQty >
        expectedQty
      ) {

        throw new Error(
          `Returned quantity cannot exceed expected quantity`
        );

      }


      // =================================================
      // UPDATE CREDIT MEMO LINE
      // =================================================

      productLine.pickedQuantity =
        returnedQty;


      productLine.returnedQuantity =
        returnedQty;


      if (
        incoming.returnReason !==
        undefined
      ) {

        productLine.returnReason =
          incoming.returnReason;

      }


      // =================================================
      // TOTAL
      // =================================================

      const price =
        Number(
          productLine.actualCost ||
          0
        );


      calculateTotalCents +=
        returnedQty *
        Math.round(
          price * 100
        );


      // =================================================
      // NO INVENTORY MOVEMENT IF ZERO
      // =================================================

      if (
        returnedQty <= 0
      ) {

        continue;

      }


      // =================================================
      // INVENTORY QUERY
      // =================================================

      const inventoryQuery: any = {

        product:
          productId,

      };


      if (
        isForeignInventory
      ) {

        inventoryQuery.location =
          inventoryLocation;

      }


      // =================================================
      // CREDIT MEMO INVENTORY MOVEMENT
      //
      // Customer -> Driver
      //
      // Therefore returned inventory becomes:
      //
      // onRouteInventory
      // =================================================

      if (
        isForeignInventory
      ) {

        // Foreign locations may legitimately need a new
        // inventory record if this product has never been
        // represented at that location before.

        await InventoryModel.findOneAndUpdate(
          inventoryQuery,

          {
            $inc: {
              onRouteInventory:
                returnedQty,
            },

            $setOnInsert: {
              location:
                inventoryLocation,

              product:
                productId,
            },
          },

          {
            session,

            new: true,

            upsert: true,

            setDefaultsOnInsert:
              true,
          }
        );

      } else {

        // Phoenix inventory should already exist.

        const result =
          await InventoryModel.updateOne(
            inventoryQuery,

            {
              $inc: {
                onRouteInventory:
                  returnedQty,
              },
            },

            {
              session,
            }
          );


        if (
          result.matchedCount ===
          0
        ) {

          throw new Error(
            `Inventory record not found for product ${productId} in Phoenix`
          );

        }

      }

    }


    // ==================================================
    // CREDIT MEMO TOTAL
    // ==================================================

    creditMemo.total =
      Number(
        (
          calculateTotalCents /
          100
        ).toFixed(2)
      );


    // ==================================================
    // RETURN INFORMATION
    // ==================================================

    creditMemo.returnSignature =
      body.signature;


    creditMemo.returnedAt =
      new Date();


    creditMemo.status =
      "received";


    creditMemo.returnedBy =
      creditMemo.routeAssigned
        ?.user;


    // ==================================================
    // SAVE
    // ==================================================

    await creditMemo.save({
      session,
    });


    await session.commitTransaction();


    return NextResponse.json(
      {
        success: true,

        inventoryLocation,

        inventoryModel:
          isForeignInventory
            ? "ForeignInventory"
            : "ProductInventory",

        creditMemo,
      },
      {
        status: 200,
      }
    );


  } catch (err: any) {

    await session.abortTransaction();


    console.error(
      "Receive credit memo error:",
      err
    );


    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to receive credit memo",
      },
      {
        status: 400,
      }
    );


  } finally {

    await session.endSession();

  }

}