import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getNextBusinessDay } from "@/utils/getNextBusinessDay";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  const { id } = await context.params;

  const sessionUser = await getServerSession(authOptions);

  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();

    const preorder = await PreOrder.findById(id)
      .populate("products.productInventory")
      .session(session);

    if (!preorder) {
      throw new Error("Preorder not found");
    }

    if (preorder.status !== "pending" && preorder.status !== "assigned") {
      throw new Error("Preorder cannot be completed");
    }

    for (const update of body.products) {
        const inventoryId =
        typeof update.productInventory === "string"
        ? update.productInventory
        : update.productInventory._id;

      const line = preorder.products.find(
        (p: any) =>
          p.productInventory._id.toString() ===
          inventoryId
      );

      if (!line) continue;

      const inventory = await ProductInventory.findById(
        inventoryId
      ).session(session);

      if (!inventory) {
        throw new Error("Inventory record not found");
      }

      const qty = Number(update.pickedQuantity);

      if (inventory.preSavedInventory < qty) {
        throw new Error("Insufficient presaved inventory");
      }

      // 🔁 MOVE INVENTORY
      inventory.preSavedInventory -= qty;
      inventory.onRouteInventory += qty;

      await inventory.save({ session });

      // Update preorder line
      line.pickedQuantity = update.pickedQuantity;
    }
    const assembledAt = new Date();
    preorder.assembledBy = new mongoose.Types.ObjectId(sessionUser?.user?.id);
    preorder.assembledAt = assembledAt;
    preorder.deliveryDate = getNextBusinessDay(assembledAt);

    preorder.status = "ready";
    await preorder.save({ session });

    await session.commitTransaction();
    return NextResponse.json(preorder);

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
