import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import InventoryReview from "@/models/InventoryReview";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getNextBusinessDay } from "@/utils/getNextBusinessDay";
import { DateTime } from "luxon";

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
    const { products, assembledBy, isPartial } = body; // <-- isPartial extracted

    const preorder = await PreOrder.findById(id).populate("products.productInventory").session(session);

    if (!preorder) throw new Error("Preorder not found");
    if (preorder.status !== "pending" && preorder.status !== "assigned") {
      throw new Error("Preorder cannot be modified");
    }

    for (const update of products) {
      const inventoryId = typeof update.productInventory === "string" ? update.productInventory : update.productInventory._id;
      const line = preorder.products.find((p: any) => p.productInventory._id.toString() === inventoryId);

      if (!line) continue;

      const inventory = await ProductInventory.findById(inventoryId).session(session);
      if (!inventory) throw new Error("Inventory record not found");

      const orderedQty = Math.round(Number(line.quantity || 0));
      const pickedQty = Math.round(Number(update.pickedQuantity || 0)); 
      const diffQty = orderedQty - pickedQty;

      if (pickedQty > orderedQty) throw new Error("Picked quantity cannot exceed ordered quantity");

      // ====== PARTIAL SAVE LOGIC ======
      if (isPartial) {
          line.pickedQuantity = pickedQty;
          line.differenceReason = diffQty > 0 ? update.differenceReason : undefined;
          continue; // SKIP INVENTORY MOVEMENT
      }

      // ====== FULL COMPLETE LOGIC ======
      if (inventory.preSavedInventory < orderedQty) {
        throw new Error(`Insufficient presaved inventory for product ${inventoryId}`);
      }

      // Move Inventory
      if (pickedQty > 0) {
        inventory.preSavedInventory -= pickedQty;
        inventory.onRouteInventory += pickedQty;
      }

      if (diffQty > 0) {
        if (!update.authorizedBy || !update.differenceReason) {
            throw new Error(`Shortage requires a reason and authorization.`);
        }
        inventory.preSavedInventory -= diffQty;
        inventory.inactiveInventory = (inventory.inactiveInventory || 0) + diffQty;

        await InventoryReview.create([{
            product: inventory.product,
            quantity: diffQty,
            differenceReason: update.differenceReason,
            authorizedBy: new mongoose.Types.ObjectId(update.authorizedBy),
            generatedBy: new mongoose.Types.ObjectId(sessionUser?.user?.id),
            source: preorder._id,
            status: "pending",
        }], { session });
      }

      await inventory.save({ session });

      // Update line
      line.pickedQuantity = pickedQty;
      line.differenceReason = diffQty > 0 ? update.differenceReason : undefined;
      line.authorizedBy = diffQty > 0 && update.authorizedBy ? new mongoose.Types.ObjectId(update.authorizedBy) : undefined;
    }

    // Only update status and dates if it's fully complete
    if (!isPartial) {
        const phoenixNow = DateTime.now().setZone("America/Phoenix");
        const assembledAt = phoenixNow.toUTC().toJSDate();
        preorder.assembledBy = new mongoose.Types.ObjectId(assembledBy || sessionUser?.user?.id);
        preorder.assembledAt = assembledAt;
        preorder.deliveryDate = getNextBusinessDay(assembledAt);
        preorder.status = "ready";
    }
    
    await preorder.save({ session });
    await session.commitTransaction();
    return NextResponse.json(preorder);

  } catch (err: any) {
    await session.abortTransaction();
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    session.endSession();
  }
}