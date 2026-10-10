import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import LoadRequest from "@/models/LoadRequest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import RouteAudit from "@/models/RouteAudit";

export async function PATCH(req: Request) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
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

    const preorders = await PreOrder.find({
      _id: { $in: preorderIds },
    }).session(session);

    // Group the affected PreOrder lines by Product ID + original reason.
    const preorderGroups = new Map<
      string,
      {
        productId: string;
        originalReason: string;
        totalDiff: number;
        lines: Array<{
          po: any;
          p: any;
          inventoryId: string;
        }>;
      }
    >();

    for (const po of preorders) {
      if (po.warehouseReturnProcessed) {
        throw new Error(
          `PreOrder ${po.number} has already been processed`
        );
      }

      for (const p of po.products) {
        const picked = Number(p.pickedQuantity || 0);
        const delivered = Number(p.deliveredQuantity || 0);
        const diff = picked - delivered;

        if (diff <= 0) continue;

        if (!p.deviationReason) {
          throw new Error(
            `PreOrder ${po.number} has an undelivered product without a deviation reason`
          );
        }

        const inventory = await ProductInventory.findById(
          p.productInventory
        )
          .select("product")
          .session(session);

        if (!inventory) {
          throw new Error(
            `Inventory ${p.productInventory} not found for PreOrder ${po.number}`
          );
        }

        const productId = inventory.product.toString();
        const originalReason = p.deviationReason;

        const key = `${productId}-${originalReason}`;

        if (!preorderGroups.has(key)) {
          preorderGroups.set(key, {
            productId,
            originalReason,
            totalDiff: 0,
            lines: [],
          });
        }

        const group = preorderGroups.get(key)!;

        group.totalDiff += diff;

        group.lines.push({
          po,
          p,
          inventoryId: inventory._id.toString(),
        });
      }
    }

    // Process each aggregated product ONCE.
    for (const group of preorderGroups.values()) {
      const agg = aggregatedProducts.find(
        (a: any) =>
          ["preorder", "po"].includes(a.sourceType) &&
          a.productId?.toString() === group.productId &&
          a.originalReason === group.originalReason
      );

      if (!agg) {
        throw new Error(
          `Missing aggregation for Product ${group.productId}, ` +
          `reason ${group.originalReason}`
        );
      }

      const verifiedQty = Number(agg.verifiedQuantity);

      if (
        !Number.isSafeInteger(verifiedQty) ||
        verifiedQty < 0 ||
        verifiedQty > group.totalDiff
      ) {
        throw new Error(
          `Invalid verified quantity for Product ${group.productId}. ` +
          `Expected between 0 and ${group.totalDiff}, got ${verifiedQty}`
        );
      }

      if (!["returned", "missing", "damaged"].includes(agg.newReason)) {
        throw new Error(
          `Invalid reconciliation reason: ${agg.newReason}`
        );
      }

      // Collect the inventory documents referenced by this group.
      const inventoryIds = [
        ...new Set(group.lines.map(line => line.inventoryId))
      ];

      // For a Phoenix ProductInventory group, these references should
      // normally all point to the same inventory document.
      if (inventoryIds.length !== 1) {
        throw new Error(
          `Multiple inventory records for Product ${group.productId}`
        );
      }

      const inventoryId = inventoryIds[0];

      const update: any = {
        $inc: {
          onRouteInventory: -group.totalDiff,
        },
      };

      // Missing: picked on paper, but never actually left warehouse.
      // Returned: customer rejected product, warehouse can resell it.
      if (
        agg.newReason === "returned" ||
        agg.newReason === "missing"
      ) {
        update.$inc.currentInventory = verifiedQty;
      }

      // Damaged: remove from truck inventory without restoring stock.
      const result = await ProductInventory.updateOne(
        {
          _id: inventoryId,
          onRouteInventory: { $gte: group.totalDiff },
        },
        update,
        { session }
      );

      if (result.matchedCount !== 1) {
        throw new Error(
          `Inventory update failed for Product ${group.productId}. ` +
          `Check that the on-route quantity is sufficient.`
        );
      }

      // Update the reason on every affected PreOrder line.
      for (const line of group.lines) {
        line.p.deviationReason = agg.newReason;
      }

      console.log("PREORDER RECONCILED:", {
        productId: group.productId,
        originalReason: group.originalReason,
        finalReason: agg.newReason,
        deductedFromRoute: group.totalDiff,
        restoredToInventory:
          agg.newReason === "returned" ||
            agg.newReason === "missing"
            ? verifiedQty
            : 0,
      });
    }

    // Mark processed only after every affected group succeeds.
    for (const po of preorders) {
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