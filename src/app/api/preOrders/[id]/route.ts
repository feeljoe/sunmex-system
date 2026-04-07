import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Preorder ID is required" },
        { status: 400 }
      );
    }
    const preorder = await PreOrder.findById(id);
    // 🔁 revert inventory
  for (const item of preorder.products) {
    await ProductInventory.findByIdAndUpdate(item.inventoryId, {
      $inc: {
        currentInventory: item.quantity,
        preSavedInventory: -item.quantity,
      },
    });
  }

   const deleted = await PreOrder.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Preorder not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE PREORDER ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete preorder" },
    { status: 500 }
  );
}
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = await context.params;
    const body = await req.json();

    const { client, products, type, noChargeReason } = body;

    const preorder = await PreOrder.findById(id).session(session);

    if (!preorder) {
      throw new Error("Preorder not found");
    }

    // -----------------------------
    // OLD MAPS
    // -----------------------------

    const oldQtyMap = new Map<string, number>();
    const oldPickedMap = new Map<string, number>();
    const oldDeliveredMap = new Map<string, number>();

    preorder.products.forEach((p: any) => {
      oldQtyMap.set(String(p.productInventory), p.quantity);
      oldPickedMap.set(String(p.productInventory), p.pickedQuantity ?? 0);
      oldDeliveredMap.set(String(p.productInventory), p.deliveredQuantity ?? 0);
    });

    // -----------------------------
    // NEW MAPS
    // -----------------------------

    const newQtyMap = new Map<string, number>();
    const newPickedMap = new Map<string, number>();
    const newDeliveredMap = new Map<string, number>();

    products.forEach((p: any) => {
      newQtyMap.set(String(p.productInventory), p.quantity);
      newPickedMap.set(String(p.productInventory), p.pickedQuantity ?? 0);
      newDeliveredMap.set(String(p.productInventory), p.deliveredQuantity ?? 0);
    });

    // -----------------------------
    // ALL INVENTORY IDS
    // -----------------------------

    const allIds = new Set([
      ...oldQtyMap.keys(),
      ...newQtyMap.keys(),
    ]);

    const failedItems: any[] = [];
    const inventoryDocs = new Map<string, any>();

    //PREVALIDATION
    for (const inventoryId of allIds) {

      const inventory = await ProductInventory
      .findById(inventoryId)
      .populate("product")
      .session(session);

      inventoryDocs.set(inventoryId, inventory);

      if(!inventory){
        failedItems.push({
          inventoryId,
          message: "Inventory Not Found",
        });
        continue;
      }

      const oldQty = oldQtyMap.get(inventoryId) || 0;
      const newQty = newQtyMap.get(inventoryId) || 0;

      const oldPicked = oldPickedMap.get(inventoryId) || 0;
      const newPicked = newPickedMap.get(inventoryId) || 0;

      const oldDelivered = oldDeliveredMap.get(inventoryId) || 0;
      const newDelivered = newDeliveredMap.get(inventoryId) || 0;

      const qtyDiff = newQty - oldQty;
      const pickedDiff = newPicked - oldPicked;
      const deliveredDiff = newDelivered - oldDelivered;

      //RULES
      if(newPicked > newQty){
        failedItems.push({
          inventoryId,
          name: inventory.product?.name,
          type: "picked",
          message: "Picked quantity exceeds ordered quantity",
        });
      }
      if(newDelivered > newPicked) {
        failedItems.push({
          inventoryId,
          name: inventory.product?.name,
          type: "delivered",
          message: "Delivered exceeds picked quantity",
        });
      }
      if(qtyDiff > 0 && inventory.currentInventory < qtyDiff){
        failedItems.push({
          inventoryId,
          name: inventory.product?.name,
          type: "quantity",
          message: "Not enough inventory",
          requested: qtyDiff,
          available: inventory.currentInventory,
        });
      }
      if(pickedDiff > 0 && inventory.preSavedInventory < pickedDiff) {
        failedItems.push({
          inventoryId,
          name: inventory.product?.name,
          type: "picked",
          message: "Not enough reserved inventory to pick",
          requested: pickedDiff,
          available: inventory.preSavedInventory,
        });
      }
      if(deliveredDiff > 0 && inventory.onRouteInventory < deliveredDiff){
        failedItems.push({
          inventoryId,
          name: inventory.product?.name,
          type: "delivered",
          message: "Not enough on-route inventory to deliver",
          requested: deliveredDiff,
          available: inventory.onRouteInventory,
        });
      }
    }

    if(failedItems.length > 0){
      throw {
        type: "INVENTORY_ERROR",
        message: "Some changes could not be applied",
        details: failedItems,
      };
    }

    //APPLY CHANGES
    for(const inventoryId of allIds){
      const inventory = inventoryDocs.get(inventoryId);

      const oldQty = oldQtyMap.get(inventoryId) || 0;
      const newQty = newQtyMap.get(inventoryId) || 0;

      const oldPicked = oldPickedMap.get(inventoryId) || 0;
      const newPicked = newPickedMap.get(inventoryId) || 0;

      const oldDelivered = oldDeliveredMap.get(inventoryId) || 0;
      const newDelivered = newDeliveredMap.get(inventoryId) || 0;

      const qtyDiff = newQty - oldQty;
      const pickedDiff = newPicked - oldPicked;
      const deliveredDiff = newDelivered - oldDelivered;

      //QTY: CURRENT <--> PRESAVED

      if(qtyDiff > 0){
        inventory.currentInventory -=qtyDiff;
        inventory.preSavedInventory +=qtyDiff;
      }
      if(qtyDiff < 0){
        const abs = Math.abs(qtyDiff);
        inventory.currentInventory += abs;
        inventory.preSavedInventory -= abs;
      }

      //PICKED: PRESAVED <--> ONROUTE

      if(pickedDiff > 0){
        inventory.preSavedInventory -= pickedDiff;
        inventory.onRouteInventory += pickedDiff;
      }
      if(pickedDiff < 0){
        const abs = Math.abs(pickedDiff);
        inventory.preSavedInventory += abs;
        inventory.onRouteInventory -= abs;
      }

      //DELIVERED: ONROUTE --> OUT OF THE INVENTORY

      if(deliveredDiff > 0){
        inventory.onRouteInventory -= deliveredDiff;
      }
      if(deliveredDiff < 0){
        const abs = Math.abs(deliveredDiff);
        inventory.onRouteInventory += abs;
      }
      await inventory.save({session});
    }

    //UPDATE PREORDER

    preorder.client = client;
    preorder.type = type;
    preorder.noChargeReason = noChargeReason;

    preorder.products = products.map((p: any) => ({
      productInventory: p.productInventory,
      quantity: p.quantity,
      pickedQuantity: p.pickedQuantity ?? 0,
      deliveredQuantity: p.deliveredQuantity ?? 0,
      actualCost:
        p.effectiveUnitPrice ??
        p.unitPrice ??
        p.actualCost ??
        0,
    }));

    preorder.subtotal = products.reduce(
      (sum: number, p: any) =>
        sum +
        p.quantity *
          (p.effectiveUnitPrice ??
            p.unitPrice ??
            p.actualCost ??
            0),
      0
    );

    preorder.total = products.reduce(
      (sum: number, p: any) =>
        sum +
        p.deliveredQuantity *
          (p.effectiveUnitPrice ??
            p.unitPrice ??
            p.actualCost ??
            0),
      0
    );

    await preorder.save({session});

    await session.commitTransaction();
    return NextResponse.json({success: true});

  } catch (err: any) {
    await session.abortTransaction();

    console.error("PATCH Preorder error: ", err);

    if(err.type === "INVENTORY_ERROR") {
      return NextResponse.json(
        {
          error: err.message,
          details: err.details,
        },
        {status: 400}
      );
    }

    return NextResponse.json(
      { error: err.message || "Unexpected Error" },
      { status: 400 }
    );

  } finally {
    session.endSession();
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;

    const preorder = await PreOrder.findById(id)
    .populate({
      path: "products.productInventory",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
    })
    .populate("client")
    .populate("routeAssigned");

    if(!preorder) {
      return NextResponse.json({ error: "Preorder Not Found"}, {status: 404});
    }
    return NextResponse.json(preorder);
  } catch(err){
    console.error(err);
    return NextResponse.json({ error: "Server error"}, {status: 500});
  }

}