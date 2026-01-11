import { connectToDatabase } from "@/lib/db";
import TruckLoad from "@/models/TruckLoad";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDatabase();

  const body = await req.json();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const load = await TruckLoad.findById(params.id).session(session);

    if (!load || load.status !== "pending") {
      throw new Error("Invalid truck load");
    }

    for (const p of body.products) {
      const inventory = await ProductInventory.findById(
        p.productInventory
      ).session(session);

      if (!inventory) throw new Error("Inventory not found");

      if (inventory.currentInventory < p.actualQuantity) {
        throw new Error(
          `Not enough inventory for ${inventory.product}`
        );
      }

      // 1️⃣ Remove from current inventory and place it on onRoute inventory
      inventory.currentInventory -= p.actualQuantity;
      inventory.onRouteInventory += p.actualQuantity;
      await inventory.save({ session });

      // 2️⃣ Add to route inventory (onRoute)
    }

    // 3️⃣ Mark load as prepared
    load.status = "prepared";
    load.products = load.products.map((p: any) => {
      const updated = body.products.find(
        (u: any) =>
          String(u.productInventory) ===
          String(p.productInventory)
      );
      return {
        ...p.toObject(),
        actualQuantity: updated?.actualQuantity ?? p.quantity,
      };
    });

    await load.save({ session });

    await session.commitTransaction();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    await session.abortTransaction();
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}
