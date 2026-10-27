import { connectToDatabase } from "@/lib/db";

import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";

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

    const processedLineIds = new Set<string>();
    if (body.products.length !== creditMemo.products.length) {
      throw new Error("All credit memo lines must be included");
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


    const hasLinkedPreOrder = Boolean(creditMemo.preorder);

    const signature =
      typeof body.signature === "string"
        ? body.signature.trim()
        : "";

    // ==================================================
    // LINKED CREDIT MEMO
    // ==================================================

    if (hasLinkedPreOrder) {
      const linkedPreorder = await PreOrder.findById(
        creditMemo.preorder
      )
        .select(
          "_id client status routeAssigned inventoryLocation"
        )
        .session(session);

      if (!linkedPreorder) {
        throw new Error(
          "Credit Memo references a PreOrder that does not exist"
        );
      }

      if (
        String(linkedPreorder.client) !==
        String(creditMemo.client)
      ) {
        throw new Error(
          "Credit Memo and PreOrder clients do not match"
        );
      }

      if (
        normalizeInventoryLocation(linkedPreorder.inventoryLocation) !==
        normalizeInventoryLocation(creditMemo.inventoryLocation)
      ) {
        throw new Error(
          "Credit Memo and PreOrder inventory locations do not match"
        );
      }

      // When no signature is provided, the linked PreOrder
      // must be ready for its separate delivery process.
      if (!signature && linkedPreorder.status !== "ready") {
        throw new Error(
          "A signature can only be deferred for a ready PreOrder"
        );
      }

    } else {
      // ==================================================
      // STANDALONE CREDIT MEMO
      // ==================================================

      if (!signature) {
        throw new Error(
          "Customer signature is required for standalone Credit Memos"
        );
      }
    }

    // ==================================================
    // VALIDATE ANY PROVIDED SIGNATURE
    // ==================================================

    if (
      signature &&
      (
        !signature.startsWith("data:image/") ||
        signature.length < 100
      )
    ) {
      throw new Error("Invalid customer signature");
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
      const lineId = String(incoming.lineId ?? "");
      if (!mongoose.isValidObjectId(lineId)) {
        throw new Error("Invalid credit memo Line ID");
      }
      if (processedLineIds.has(lineId)) {
        throw new Error(`Duplicate credit memo line: ${lineId}`);
      }
      processedLineIds.add(lineId);
      const productLine = creditMemo.products.id(lineId);
      if (!productLine) {
        throw new Error(`Credit memo line ${lineId} was not found`);
      }

      const productId = productLine.product.toString();

      if (incoming.product && String(incoming.product?._id ?? incoming.product) !== productId) {
        throw new Error(`Product mismatch for credit memo line ${lineId}`);
      }

      // =================================================
      // RETURNED QUANTITY
      // =================================================

      const returnedQty = Math.round(Number(incoming.returnedQuantity));

      const expectedQty = Math.round(Number(productLine.quantity));

      if (!Number.isInteger(returnedQty) || returnedQty < 0 || !Number.isInteger(expectedQty) || expectedQty < 0) {
        throw new Error("Invalid credit memo quantities");
      }

      if (returnedQty > expectedQty) {
        throw new Error(`Returned quantity exceeds expected quantity for line ${lineId}. ` +
          `Expected: ${expectedQty}, Returned: ${returnedQty}`);
      }

      // =================================================
      // UPDATE CREDIT MEMO LINE
      // =================================================

      productLine.pickedQuantity = returnedQty;
      productLine.returnedQuantity = returnedQty;

      if (incoming.returnReason !== undefined) {
        productLine.returnReason = incoming.returnReason;
      }

      // =================================================
      // TOTAL
      // =================================================

      const price = Number(productLine.actualCost || 0);
      calculateTotalCents += returnedQty * Math.round(price * 100);

      // =================================================
      // NO INVENTORY MOVEMENT IF ZERO
      // =================================================

      if (returnedQty <= 0) {
        continue;
      }

      // =================================================
      // INVENTORY QUERY
      // =================================================

      const inventoryQuery: any = {
        product:
          productId,
      };

      if (isForeignInventory) {
        inventoryQuery.location = inventoryLocation;
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

      if (isForeignInventory) {

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

        if (result.matchedCount === 0) {
          throw new Error(`Inventory record not found for product ${productId} in Phoenix`);
        }
      }
    }

    // ==================================================
    // CREDIT MEMO TOTAL
    // ==================================================

    creditMemo.total = Number((calculateTotalCents / 100).toFixed(2));

    // ==================================================
    // RETURN INFORMATION
    // ==================================================

    if (signature) {
      creditMemo.returnSignature = signature;
    }

    creditMemo.returnedAt = new Date();

    creditMemo.status = "received";

    creditMemo.returnedBy = creditMemo.routeAssigned?.user?._id ?? creditMemo.routeAssigned?.user;

    // ==================================================
    // SAVE
    // ==================================================

    await creditMemo.save({ session });
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
    console.error("Receive credit memo error: ", err);

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