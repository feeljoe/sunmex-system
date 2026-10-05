import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import mongoose from "mongoose";
import { getInventoryModel, normalizeInventoryLocation } from "@/utils/inventoryResolver";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
    await connectToDatabase();

    const { id } = await context.params;

    // ✅ Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid credit memo ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, cancelReason, cancelledBy } = body;

    // ✅ Validate action
    if (action !== "cancel") {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    // ✅ Validate required fields
    if (!cancelReason || !cancelledBy) {
      return NextResponse.json(
        { message: "Cancel reason and cancelledBy are required" },
        { status: 400 }
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

    const creditMemo = await CreditMemo.findById(id).session(session);

    if (!creditMemo) {
      await session.abortTransaction();
      return NextResponse.json(
        { message: "Credit memo not found" },
        { status: 404 }
      );
    }

    const wasReceived = creditMemo.status === "received";

    // ✅ Prevent double cancellation
    if (creditMemo.status === "cancelled") {
      await session.abortTransaction();
      return NextResponse.json(
        { message: "Credit memo already cancelled" },
        { status: 400 }
      );
    }

    if(!["pending", "received"].includes(creditMemo.status)){
      throw new Error(`Credit memo cannot be cancelled from status ${creditMemo.status}`);
    }

    const inventoryLocation = normalizeInventoryLocation(creditMemo.inventoryLocation);
    const isForeignInventory = inventoryLocation !== "phoenix";
    const InventoryModel = getInventoryModel(inventoryLocation);

    if(wasReceived) {
      for(const item of creditMemo.products) {
        const receivedQty = Math.round(Number(item.pickedQuantity || item.returnedQuantity || 0));

        if(receivedQty <=0) {
          continue;
        }

        const inventoryQuery: any ={
          product: item.product,
          onRouteInventory: {
            $gte: receivedQty,
          },
        };

        if(isForeignInventory) {
          inventoryQuery.location = inventoryLocation;
        }

        const updatedInventory = await InventoryModel.findOneAndUpdate(inventoryQuery,
          {
            $inc: {
              onRouteInventory: -receivedQty,
            },
          },
          {
            new: true,
            session,
          }
        );

        if(!updatedInventory) {
          const existingQuery: any = {
            product: item.product,
          };
          if(isForeignInventory){
            existingQuery.location = inventoryLocation;
          }

          const existingInventory = await InventoryModel.findOne(existingQuery).session(session);
          const productName = `${item.product?.brand?.name} ${item.product?.name} ${item.product?.weight}${item.product?.unit?.toUpperCase()}`;
          if(!existingInventory) {
            throw new Error(`Inventory record not found for product ${productName} in ${inventoryLocation}`);
          }

          throw new Error (`Cannot cancel this credit memo because only ${existingInventory.onRouteInventory || 0} units are currently onRoute but ${receivedQty} units need to be reversed. The credit memo may already have been reconciled by the warehouse.`);
        }
      }
    }

    // ✅ Update fields
    creditMemo.status = "cancelled";
    creditMemo.cancelReason = cancelReason;
    creditMemo.cancelledBy = cancelledBy;
    creditMemo.cancelledAt = new Date();
    creditMemo.preorder = null;

    await creditMemo.save({session,});

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      inventoryReversed: wasReceived,
      inventoryLocation,
      inventoryModel: isForeignInventory ? "Foreign Inventory" : "ProductInventory",
      creditMemo,
     },
    { status: 200 });

  } catch (error: any) {
    await session.abortTransaction();
    console.error("Cancel credit memo error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 400 }
    );
  }finally {
    await session.endSession();
  }
}