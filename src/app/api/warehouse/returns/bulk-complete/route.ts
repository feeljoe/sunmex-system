import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
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
      creditMemoIds = [], // Array of all CM _ids for this route
      preorderIds = [], // Array of all Preorder _ids for this route
      aggregatedProducts, // Array of { productId, returnReason, totalPicked, verifiedQuantity }, now includes originalReason, newReason, sourceType
      warehouseUser,
      driverSignature,
      warehouseSignature,
    } = body;

    // 1. Fetch all the actual Credit Memo documents we are updating
    const creditMemos = await CreditMemo.find({ _id: { $in: creditMemoIds } }).session(session);

    // 2. Process each aggregated product group
    for (const agg of aggregatedProducts) {
      if (agg.sourceType === "preorder") continue;
      const pickedQty = Math.round(Number(agg.totalPicked) || 0);
      const verifiedQty = Math.round(Number(agg.verifiedQuantity) || 0);
      let shortage = Math.max(pickedQty - verifiedQty, 0); // Calculate how many are missing

      // --- INVENTORY UPDATE ---
      const invUpdate: any = {
        $inc: { onRouteInventory: -pickedQty }, // Always clear the truck of what was originally picked
      };

      // Only add the VERIFIED amount back to current inventory if it's a good return
      if (agg.newReason === "good return" || agg.newReason === "returned") {
        invUpdate.$inc.currentInventory = verifiedQty;
      } else if (agg.newReason === "credit memo") {
        invUpdate.$inc.onRouteInventory = -pickedQty; // Clear from inactive if tracking that
      }

      await ProductInventory.updateOne(
        { product: agg.productId },
        invUpdate,
        { session }
      );

      // --- CREDIT MEMO DISTRIBUTION (Short the first documents) ---
      for (const cm of creditMemos) {
        // Find the matching product line in this specific Credit Memo
        const cmProductLine = cm.products.find(
          (p: any) => p.product.toString() === agg.productId && p.returnReason === agg.originalReason
        );

        if (cmProductLine) {
          const originalCMQty = cmProductLine.pickedQuantity || 0;

          // If we have a shortage, deduct it from this CM up to its max quantity
          const amountToDeduct = Math.min(shortage, originalCMQty);
          const finalVerifiedForThisCM = originalCMQty - amountToDeduct;

          // Update the line item
          cmProductLine.warehouseVerifiedQuantity = finalVerifiedForThisCM;
          cmProductLine.returnReason = agg.newReason; // Update reason!
          // Reduce the remaining shortage for the next loop
          shortage -= amountToDeduct;
        }
      }
    }

    const preorders = await PreOrder.find({ _id: { $in: preorderIds } }).session(session);
    
    for (const po of preorders) {
        for (const p of po.products) {
            const diff = (p.pickedQuantity || 0) - (p.deliveredQuantity || 0);
            
            if (diff > 0 && p.deviationReason) {
                // Find the warehouse instructions for this specific item
                const agg = aggregatedProducts.find((a: any) => 
                    a.sourceType === "preorder" && 
                    a.productId === p.productInventory?.toString() && 
                    a.originalReason === p.deviationReason
                );
                
                if (agg) {
                    p.deviationReason = agg.newReason; // Override the reason if warehouse changed it!
                    
                    // Clear from the truck's virtual inventory
                    const poInvUpdate: any = { $inc: { onRouteInventory: -diff } };
                    
                    // If returned (came back on truck) OR missing (never left warehouse), 
                    // put it back into current warehouse stock based on the verified count.
                    if (agg.newReason === "returned" || agg.newReason === "missing") {
                        poInvUpdate.$inc.currentInventory = agg.verifiedQuantity;
                    }
                    
                    await ProductInventory.updateOne({ _id: p.productInventory }, poInvUpdate, { session });
                }
            }
        }
        po.warehouseReturnProcessed = true;
        await po.save({ session });
    }

    // 3. Mark all Credit Memos as completed and save
    for (const cm of creditMemos) {
      cm.warehouseStatus = "completed";
      cm.receivedBy = warehouseUser;
      cm.driverSignature = driverSignature;
      cm.warehouseSignature = warehouseSignature;
      cm.warehouseReceivedAt = new Date();
      await cm.save({ session });
    }

    await session.commitTransaction();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Warehouse bulk receive error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}