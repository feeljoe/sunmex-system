import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import LoadRequest from "@/models/LoadRequest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import RouteAudit from "@/models/RouteAudit";
import { getOutstandingLoadRequestLots } from "@/lib/inventory/reconcileLoadRequestLots";

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


    // ============================================================
    // 4. PROCESS LOAD REQUEST RETURNS
    // Supports legacy aggregate-only and new lot-tracked requests.
    // Runs inside the existing MongoDB transaction.
    // ============================================================

    const ids = loadRequestIds.map(String);

    if (
      ids.some((id: string) => !mongoose.isValidObjectId(id)) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error("Invalid or duplicate Load Request IDs");
    }

    const loadRequests = await LoadRequest.find({
      _id: { $in: ids },
    }).session(session);

    if (loadRequests.length !== ids.length) {
      throw new Error("One or more Load Requests were not found");
    }

    type ReturnEntry = {
      lr: any;
      line: any;
      productId: string;
      approved: number;
      assembled: number;
      delivered: number;
      unassembled: number;
      undelivered: number;
      tracked: boolean;
      reason: string;
      restored: number;
      newReason: string;
    };

    const entries: ReturnEntry[] = [];

    for (const lr of loadRequests) {
      if (lr.warehouseReturnProcessed) {
        throw new Error(
          `Load Request ${lr.LRNumber} has already been reconciled`
        );
      }

      if (lr.status !== "delivered") {
        throw new Error(
          `Load Request ${lr.LRNumber} must be delivered before reconciliation`
        );
      }

      for (const line of lr.products) {
        const approved = Number(line.approvedQuantity ?? 0);
        const assembled = Number(line.assembledQuantity ?? 0);
        const delivered = Number(line.deliveredQuantity ?? 0);

        if (
          ![approved, assembled, delivered].every(
            (n) => Number.isSafeInteger(n) && n >= 0
          ) ||
          delivered > assembled ||
          assembled > approved
        ) {
          throw new Error(
            `Invalid quantities in ${lr.LRNumber}`
          );
        }

        const undelivered = assembled - delivered;

        entries.push({
          lr,
          line,
          productId: String(line.product),
          approved,
          assembled,
          delivered,
          unassembled: approved - assembled,
          undelivered,
          tracked: Number(lr.lotTrackingVersion ?? 0) === 1,
          reason: String(line.differenceReason ?? ""),
          restored: 0,
          newReason: "",
        });
      }
    }

    // Group by product + original difference reason.
    // The UI supplies ONE verified quantity for each group.
    const groups = new Map<string, ReturnEntry[]>();

    for (const entry of entries) {
      if (entry.undelivered <= 0) continue;

      if (!entry.reason) {
        throw new Error(
          `${entry.lr.LRNumber} has undelivered units without a difference reason`
        );
      }

      const key = `${entry.productId}::${entry.reason}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(entry);
    }

    // Validate every aggregate exactly once.
    for (const [key, group] of groups) {
      const [productId, originalReason] = key.split("::");

      const matches = aggregatedProducts.filter(
        (agg: any) =>
          ["loadRequest", "lr"].includes(agg.sourceType) &&
          String(agg.productId) === productId &&
          agg.originalReason === originalReason
      );

      if (matches.length !== 1) {
        throw new Error(
          `Expected exactly one return aggregation for ${key}`
        );
      }

      const agg = matches[0];

      const totalUndelivered = group.reduce(
        (sum, entry) => sum + entry.undelivered,
        0
      );

      const verified = Number(agg.verifiedQuantity);
      const newReason = String(agg.newReason ?? "");

      if (
        !Number.isSafeInteger(verified) ||
        verified < 0 ||
        verified > totalUndelivered
      ) {
        throw new Error(
          `Invalid verified quantity for ${key}`
        );
      }

      if (
        !["returned", "missing", "damaged"].includes(newReason)
      ) {
        throw new Error(
          `Invalid reconciliation reason for ${key}`
        );
      }

      const restorable =
        newReason === "returned" ||
        newReason === "missing";

      if (!restorable && verified !== 0) {
        throw new Error(
          `Damaged inventory cannot be restored for ${key}`
        );
      }

      const totalToRestore = restorable ? verified : 0;

      // The aggregate UI does not specify which LR a partial
      // return belongs to. For new lot-tracked requests,
      // do not guess across multiple load requests.
      const hasTracked = group.some((e) => e.tracked);

      if (
        hasTracked &&
        totalToRestore > 0 &&
        totalToRestore < totalUndelivered &&
        group.length > 1
      ) {
        throw new Error(
          `Partial return for ${key} spans multiple load requests. ` +
          "Record verified quantities per load request before reconciling."
        );
      }

      let remainingRestore = totalToRestore;

      // Deterministic distribution for legacy aggregates.
      // New requests with ambiguous partial groups were
      // already rejected above.
      group.sort((a, b) =>
        String(a.lr._id).localeCompare(String(b.lr._id))
      );

      for (const entry of group) {
        entry.restored = Math.min(
          entry.undelivered,
          remainingRestore
        );

        entry.newReason = newReason;
        remainingRestore -= entry.restored;
      }

      if (remainingRestore !== 0) {
        throw new Error(
          `Unable to distribute verified return for ${key}`
        );
      }
    }

    // Process each LR line in one transaction.
    for (const entry of entries) {
      const {
        lr,
        line,
        productId,
        approved,
        unassembled,
        undelivered,
        restored,
        tracked,
      } = entry;

      if (approved === 0) continue;

      const inventory = await ProductInventory.findOne({
        product: line.product,
      }).session(session);

      if (!inventory) {
        throw new Error(
          `Phoenix inventory missing for product ${productId}`
        );
      }

      if (
        Number(inventory.preSavedInventory ?? 0) <
        unassembled ||
        Number(inventory.onRouteInventory ?? 0) <
        undelivered
      ) {
        throw new Error(
          `Inventory balances do not match ${lr.LRNumber} ` +
          `for product ${productId}`
        );
      }

      if (tracked) {
        // For new load requests, verify and reconcile lots.
        const outstanding = getOutstandingLoadRequestLots(line);

        const totalOutstanding = outstanding.reduce(
          (sum, lot) => sum + lot.reservedRemaining,
          0
        );

        if (
          totalOutstanding !== unassembled + undelivered
        ) {
          throw new Error(
            `Outstanding lot totals do not match ${lr.LRNumber}`
          );
        }

        const onRouteLots = outstanding.filter(
          (lot) => lot.onRouteRemaining > 0
        );

        // Partial physical returns spanning multiple lots
        // cannot be attributed accurately without lot counts.
        if (
          restored > 0 &&
          restored < undelivered &&
          onRouteLots.length > 1
        ) {
          throw new Error(
            `${lr.LRNumber}: partial return spans multiple lots. ` +
            "Warehouse must verify returned quantities per lot."
          );
        }

        let lostRemaining = undelivered - restored;

        for (const outstandingLot of outstanding) {
          const lot = inventory.lots.id(
            outstandingLot.lotId
          );

          if (!lot) {
            throw new Error(
              `Lot ${outstandingLot.lotId} not found`
            );
          }

          const reservedQty = Number(
            lot.onRouteReservedQty ?? 0
          );

          const currentQty = Number(
            lot.currentQty ?? 0
          );

          if (
            reservedQty < outstandingLot.reservedRemaining ||
            currentQty < outstandingLot.reservedRemaining
          ) {
            throw new Error(
              `Insufficient lot balances in ${lot.lotNumber}`
            );
          }

          // If everything came back, no lot units are lost.
          // If nothing came back, all undelivered on-route
          // units are removed from physical lot stock.
          // For one-lot partial returns, the loss is
          // unambiguous.
          let lostFromLot = 0;

          if (restored === 0) {
            lostFromLot = outstandingLot.onRouteRemaining;
          } else if (restored === undelivered) {
            lostFromLot = 0;
          } else {
            lostFromLot = Math.min(
              outstandingLot.onRouteRemaining,
              lostRemaining
            );
          }

          if (lostFromLot > lostRemaining) {
            throw new Error("Invalid lot loss distribution");
          }

          lot.currentQty = currentQty - lostFromLot;

          lot.onRouteReservedQty =
            reservedQty - outstandingLot.reservedRemaining;

          if (
            outstandingLot.onRouteRemaining > 0 ||
            lostFromLot > 0
          ) {
            lot.hasMovement = true;
            lot.lastMovementAt = new Date();
          }

          lostRemaining -= lostFromLot;
        }

        if (lostRemaining !== 0) {
          throw new Error(
            `Unreconciled lot loss in ${lr.LRNumber}`
          );
        }
      }

      // Release both outstanding aggregate buckets:
      // - approved but not assembled
      // - assembled but not delivered
      inventory.preSavedInventory =
        Number(inventory.preSavedInventory ?? 0) -
        unassembled;

      inventory.onRouteInventory =
        Number(inventory.onRouteInventory ?? 0) -
        undelivered;

      inventory.currentInventory =
        Number(inventory.currentInventory ?? 0) +
        unassembled +
        restored;

      await inventory.save({ session });

      if (undelivered > 0) {
        line.differenceReason = entry.newReason;
      }
    }

    for (const lr of loadRequests) {
      lr.warehouseReturnProcessed = true;
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