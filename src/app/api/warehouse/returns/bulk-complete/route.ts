import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import LoadRequest from "@/models/LoadRequest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import RouteAudit from "@/models/RouteAudit";

export async function PATCH(req: Request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      creditMemoIds = [], 
      preorderIds = [], 
      loadRequestIds = [],
      auditIds = [], 
      aggregatedProducts, 
      warehouseUser,
      driverSignature,
      warehouseSignature,
    } = body;

    // 1. Fetch all the actual Credit Memo documents we are updating
    const creditMemos = await CreditMemo.find({ _id: { $in: creditMemoIds } }).session(session);

    // 2. Process each aggregated product group
    for (const agg of aggregatedProducts) {
      // Skip logic for Preorders, Audits, and Load Requests (they are handled individually below)
      if (["preorder", "po", "audit", "au", "loadRequest", "lr"].includes(agg.sourceType)) continue;
      
      const pickedQty = Math.round(Number(agg.totalPicked) || 0);
      const verifiedQty = Math.round(Number(agg.verifiedQuantity) || 0);
      let shortage = Math.max(pickedQty - verifiedQty, 0);

      // --- CM INVENTORY UPDATE ---
      const invUpdate: any = {
        $inc: { onRouteInventory: -pickedQty }, 
      };

      if (agg.newReason === "good return" || agg.newReason === "returned") {
        invUpdate.$inc.currentInventory = verifiedQty;
      }

      await ProductInventory.updateOne(
        { product: agg.productId },
        invUpdate,
        { session }
      );

      // --- CREDIT MEMO DISTRIBUTION ---
      for (const cm of creditMemos) {
        const cmProductLine = cm.products.find(
          (p: any) => p.product.toString() === agg.productId && p.returnReason === agg.originalReason
        );

        if (cmProductLine) {
          const originalCMQty = cmProductLine.pickedQuantity || 0;
          const amountToDeduct = Math.min(shortage, originalCMQty);
          const finalVerifiedForThisCM = originalCMQty - amountToDeduct;

          cmProductLine.warehouseVerifiedQuantity = finalVerifiedForThisCM;
          cmProductLine.returnReason = agg.newReason; 
          shortage -= amountToDeduct;
        }
      }
    }

    // --- 3. PROCESS PREORDERS ---
    const preorders = await PreOrder.find({ _id: { $in: preorderIds } }).session(session);
    for (const po of preorders) {
        for (const p of po.products) {
            const diff = (p.pickedQuantity || 0) - (p.deliveredQuantity || 0);
            
            if (diff > 0 && p.deviationReason) {
                const agg = aggregatedProducts.find((a: any) => 
                    (a.sourceType === "preorder" || a.sourceType === "po") && 
                    a.productId === p.productInventory?.toString() && 
                    a.originalReason === p.deviationReason
                );
                
                if (agg) {
                    p.deviationReason = agg.newReason; 
                    const poInvUpdate: any = { $inc: { onRouteInventory: -diff } };
                    
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

    // --- 4. PROCESS LOAD REQUESTS (NEW) ---
    const loadRequests = await LoadRequest.find({ _id: { $in: loadRequestIds } }).session(session);
    for (const lr of loadRequests) {
        for (const p of lr.products) {
            const diff = (p.assembledQuantity || 0) - (p.deliveredQuantity || 0);
            
            if (diff > 0 && p.differenceReason) {
                const agg = aggregatedProducts.find((a: any) => 
                    (a.sourceType === "loadRequest" || a.sourceType === "lr") && 
                    a.productId === p.product?.toString() && 
                    a.originalReason === p.differenceReason
                );
                
                if (agg) {
                    p.differenceReason = agg.newReason; 
                    
                    // Clear from the truck's virtual inventory
                    const lrInvUpdate: any = { $inc: { onRouteInventory: -diff } };
                    
                    // Put it back into warehouse stock based on verified count
                    if (agg.newReason === "returned" || agg.newReason === "missing") {
                        lrInvUpdate.$inc.currentInventory = agg.verifiedQuantity;
                    }
                    
                    // Note: LR stores the `product` ID, so we query ProductInventory differently than Preorders
                    await ProductInventory.updateOne({ product: p.product }, lrInvUpdate, { session });
                }
            }
        }
        lr.warehouseReturnProcessed = true; // Flags this LR as completed
        await lr.save({ session });
    }

    // --- 5. FINALIZE CREDIT MEMOS ---
    for (const cm of creditMemos) {
      cm.warehouseStatus = "completed";
      cm.receivedBy = warehouseUser;
      cm.driverSignature = driverSignature;
      cm.warehouseSignature = warehouseSignature;
      cm.warehouseReceivedAt = new Date();
      await cm.save({ session });
    }

    // --- 6. PROCESS AUDITS ---
    const audits = await RouteAudit.find({ _id: { $in: auditIds } }).session(session);
    for (const au of audits) {
      for (const p of au.products) {
        const agg = aggregatedProducts.find((a: any) =>
          (a.sourceType === "audit" || a.sourceType === "au") &&
          a.productId === p.product?.toString() &&
          a.originalReason === p.reason
        );
        if (agg) {
          p.newReason = agg.newReason;
          p.verifiedQuantity = agg.verifiedQuantity;

          const invUpdate: any = { $inc: {} };
          if (p.difference && agg.newReason === "returned") {
              invUpdate.$inc.currentInventory = agg.verifiedQuantity;
          }

          if (Object.keys(invUpdate.$inc).length > 0) {
            await ProductInventory.updateOne({ product: p.product }, invUpdate, { session });
          }
        }
      }
      au.status = "completed";
      au.receivedBy = warehouseUser;
      au.driverSignature = driverSignature;
      au.warehouseSignature = warehouseSignature;
      au.warehouseReceivedAt = new Date();
      await au.save({ session });
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