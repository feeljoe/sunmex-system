import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import InventoryReview from "@/models/InventoryReview";
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

      const orderedQty = Number(line.quantity);
      const pickedQty = Number(update.pickedQuantity);

      if (inventory.preSavedInventory < orderedQty) {
        throw new Error("Insufficient presaved inventory");
      }
      if(pickedQty > orderedQty) {
        throw new Error("Picked quantity cannot exceed ordered quantity");
      }
      const diffQty = orderedQty - pickedQty;

      // 🔁 MOVE INVENTORY
      if(pickedQty > 0){
      inventory.preSavedInventory -= pickedQty;
      inventory.onRouteInventory += pickedQty;
      }

      if(diffQty > 0) {
        inventory.preSavedInventory -= diffQty;
        inventory.inactiveInventory = (inventory.inactiveInventory || 0) + diffQty;

        await InventoryReview.create(
          [
            {
              product: inventory.product,
              quantity: diffQty,
              differenceReason: update.differenceReason,
              authorizedBy: new mongoose.Types.ObjectId(update.authorizedBy),
              generatedBy: new mongoose.Types.ObjectId(
                sessionUser?.user?.id
              ),
              source: preorder._id,
              status: "pending",
            },
          ],
          {session}
        );
      }

      await inventory.save({ session });

      // Update preorder line
      line.pickedQuantity = pickedQty;
      line.differenceReason = update.differenceReason;
      line.authorizedBy = update.authorizedBy
        ? new mongoose.Types.ObjectId(update.authorizedBy)
        : undefined;
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
