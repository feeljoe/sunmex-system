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

    // 🔵 Build OLD products map
    const oldMap = new Map<string, number>();

    preorder.products.forEach((p:any) => {
      oldMap.set(String(p.productInventory), p.quantity);
    });

    // 🔵 Build NEW products map
    const newMap = new Map<string, number>();

    products.forEach((p:any) => {
      newMap.set(String(p.inventoryId), p.quantity);
    });

    // 🔵 All inventory IDs involved
    const allIds = new Set([
      ...oldMap.keys(),
      ...newMap.keys(),
    ]);

    for (const inventoryId of allIds) {

      const oldQty = oldMap.get(inventoryId) || 0;
      const newQty = newMap.get(inventoryId) || 0;

      const difference = newQty - oldQty;

      if (difference === 0) continue;

      const inventory = await ProductInventory
        .findById(inventoryId)
        .session(session);

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      // Increase reservation
      if (difference > 0) {

        if (inventory.currentInventory < difference) {
          throw new Error(
            `Insufficient inventory for ${inventory.product?.name}`
          );
        }

        inventory.currentInventory -= difference;
        inventory.preSavedInventory += difference;
      }

      // Reduce reservation
      if (difference < 0) {

        const abs = Math.abs(difference);

        inventory.currentInventory += abs;
        inventory.preSavedInventory -= abs;
      }

      await inventory.save({ session });
    }

    // 🔵 Update preorder fields

    preorder.client = client;
    preorder.type = type;
    preorder.noChargeReason = noChargeReason;

    preorder.products = products.map((p:any) => ({
      productInventory: p.inventoryId,
      quantity: p.quantity,
      actualCost:
        p.effectiveUnitPrice ??
        p.unitPrice ??
        p.actualCost ??
        0,
    }));

    preorder.subtotal = products.reduce(
      (sum:number, p:any) =>
        sum + p.quantity *
        (p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0),
      0
    );

    await preorder.save({ session });

    await session.commitTransaction();

    return NextResponse.json({ success: true });

  } catch (err:any) {

    await session.abortTransaction();

    console.error(err);

    return NextResponse.json(
      { error: err.message },
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