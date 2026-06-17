import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      creditMemoId,
      products, // Array of { productId, pickedQuantity, warehouseVerifiedQuantity, returnReason }
      warehouseUser,
      driverSignature,
      warehouseSignature,
    } = body;

    // 1. Process Inventory
    for (const p of products) {
      const pickedQty = Number(p.pickedQuantity) || 0;
      const verifiedQty = Number(p.warehouseVerifiedQuantity) || 0;

      const invUpdate: any = {
        $inc: {
          onRouteInventory: -pickedQty, // Clear the truck entirely
        },
      };

      // Only add the VERIFIED amount back to current inventory if it's a good return
      if (p.returnReason === "good return") {
        invUpdate.$inc.currentInventory = verifiedQty;
      }

      await ProductInventory.updateOne(
        { product: p.productId },
        invUpdate,
        { session }
      );

      // 2. Update the verified quantity on the Credit Memo document
      await CreditMemo.updateOne(
        { _id: creditMemoId, "products.product": p.productId },
        {
          $set: {
            "products.$.warehouseVerifiedQuantity": verifiedQty,
          },
        },
        { session }
      );
    }

    // 3. Mark the Credit Memo as completed
    await CreditMemo.updateOne(
      { _id: creditMemoId },
      {
        warehouseStatus: "completed",
        receivedBy: warehouseUser,
        driverSignature,
        warehouseSignature,
        warehouseReceivedAt: new Date(),
      },
      { session }
    );

    await session.commitTransaction();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Warehouse receive error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}