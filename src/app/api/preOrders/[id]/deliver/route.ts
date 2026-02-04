import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { signature, products } = await req.json();

    const preorder = await PreOrder.findById(id)
    .populate({
      path: "products.productInventory",
      populate: {path: "product"},
    }).session(session);
    if (!preorder) throw new Error("Preorder not found");

    if (preorder.status !== "ready") {
      throw new Error("Preorder not ready for delivery");
    }

    // Update inventory
    for (const item of products) {
      const inventoryId =
        typeof item.productInventory === "object"
          ? item.productInventory._id
          : item.productInventory;
    
      const inventory = await ProductInventory.findById(inventoryId).session(session);
      if (!inventory) throw new Error("Inventory not found");
  
      const deliveredQty = Number(item.deliveredQuantity || 0);
      const originalQty = Number(item.quantity);
      if(deliveredQty < 0 || deliveredQty > originalQty){
        throw new Error("Invalid delivered quantity");
      }
    
      if(inventory.onRouteInventory < deliveredQty) {
        throw new Error(`Insufficient on-route inventory for product ${inventory._id}`);
      }
      inventory.onRouteInventory -= deliveredQty;
    
      await inventory.save({ session });
    }    
    for (const p of preorder.products) {
      const update = products.find(
        (up: any) =>
          (typeof up.productInventory === "object"
            ? up.productInventory._id
            : up.productInventory
          ).toString() === p.productInventory._id.toString()
      );
    
      if (update) {
        p.deliveredQuantity = update.deliveredQuantity ?? 0;
        p.deviationReason = update.deviationReason ?? null;
      }
    }

    // Recalculate total based on delivered quantities
    let newTotal = 0;

    for (const p of preorder.products) {
      const unitPrice = p.productInventory?.product?.unitPrice || 0;
      const deliveredQty = Number(p.deliveredQuantity || 0);

      newTotal += deliveredQty * unitPrice;
    }

    preorder.total = preorder.type === "noCharge" ? 0: newTotal;


    preorder.status = "delivered";
    preorder.deliveredAt = new Date();
    preorder.deliverySignature = signature;

    await preorder.save({ session });

    await session.commitTransaction();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    await session.abortTransaction();

  console.error("DELIVER ERROR FULL:", err);
  console.error("DELIVER ERROR MESSAGE:", err?.message);
  console.error("DELIVER ERROR STACK:", err?.stack);

  return NextResponse.json(
    { error: err?.message || "Unknown error during delivery" },
    { status: 400 }
  );
  } finally {
    session.endSession();
  }
}
