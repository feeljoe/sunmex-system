import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import LoadRequest from "@/models/LoadRequest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import RouteAudit from "@/models/RouteAudit";
import { getOutstandingLoadRequestLots } from "@/lib/inventory/reconcileLoadRequestLots";
import ForeignInventory
 from "@/models/ForeignInventory";
import { normalizeInventoryLocation, getInventoryModel } from "@/utils/inventoryResolver";

type InventoryLocation =
| "phoenix"
| "tucson"
| "yuma"
| "elPaso"
| "lasVegas";
function resolveWarehouse(location:string | null | undefined) {
  const inventoryLocation = normalizeInventoryLocation(location) as InventoryLocation;
  const InventoryModel = inventoryLocation === "phoenix" ? ProductInventory : ForeignInventory;
  return {
    inventoryLocation, InventoryModel, inventoryModelName: inventoryLocation === "phoenix" ? "ProductInventory" : "ForeignInventory",
  };
}

const VALID_LOCATIONS = [
  "phoenix",
  "tucson",
  "yuma",
  "elPaso",
  "lasVegas",
] as const;

function getStrictWarehouse(location: unknown) {
  if (
    typeof location !== "string" ||
    !VALID_LOCATIONS.includes(location as any)
  ) {
    throw new Error(
      `Invalid or missing inventory location: ${String(location)}`
    );
  }

  const InventoryModel =
    location === "phoenix"
      ? ProductInventory
      : ForeignInventory;

  return { InventoryModel, inventoryLocation: location };
}

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
    const creditMemos = await CreditMemo.find({_id: {$in: creditMemoIds},}).session(session);
    for (const agg of aggregatedProducts) {
      if(["preorder", "po", "audit", "au", "loadRequest", "lr"].includes(agg.sourceType)){
        continue;
      }
      if(!agg.inventoryLocation) {
        throw new Error(`Missing inventory location for Credit Memo Product ${agg.productId}`);
      }
      const warehouse = resolveWarehouse(agg.inventoryLocation);
      const {
        inventoryLocation, InventoryModel
      } = warehouse;
      const matchingLines: Array<{cm: any; line: any;}> = [];
      for (const cm of creditMemos) {
        const cmLocation = resolveWarehouse(cm.inventoryLocation).inventoryLocation;
        if(cmLocation !== inventoryLocation) continue;
        for(const line of cm.products) {
          if(String(line.product) === String(agg.productId) && line.returnReason === agg.originalReason) {
            matchingLines.push({cm, line});
          }
        }
      }
      if(matchingLines.length === 0) {
        throw new Error(`No matching Credit Memo Lines for ${agg.productId} in ${inventoryLocation}`);
      }
      const pickedQty = matchingLines.reduce((total, { line }) => total + Number(line.pickedQuantity ?? 0), 0);
      const verifiedQty = Number(agg.verifiedQuantity);
      if (!Number.isSafeInteger(pickedQty) || pickedQty < 0 || !Number.isSafeInteger(verifiedQty) || verifiedQty < 0 || verifiedQty > pickedQty) {
        throw new Error(`Invalid Credit Memo Quantities for ${agg.productId}`);
      }
      if(!Number.isSafeInteger(Number(agg.totalPicked)) || Number(agg.totalPicked) !== pickedQty) {
        throw new Error(`Credit Memo quantity mismatch for ${agg.productId} in ${inventoryLocation}`);
      }
      if (!["good return", "returned", "credit memo"].includes(agg.newReason)) {
        throw new Error(`Invalid Credit Memo return reason: ${agg.newReason}`);
      }
      const invUpdate: any = {
        $inc: {
          onRouteInventory: -pickedQty,
        },
      };
      if(agg.newReason === "good return" || agg.newReason === "returned") {
        invUpdate.$inc.currentInventory = verifiedQty;
      }
      const inventoryFilter: any = {
        product: agg.productId, onRouteInventory: {$gte: pickedQty},
      };
      if(inventoryLocation !== "phoenix") {
        inventoryFilter.location = inventoryLocation;
      }
      const result = await InventoryModel.updateOne(inventoryFilter, invUpdate, {session});
      if(result.matchedCount !== 1) {
        throw new Error(`Credit Memo inventory update failed for product ${agg.productId} in ${inventoryLocation}. Inventory may be missing or onRouteInventory insufficient.`);
      }
      let remainingVerified = verifiedQty;
      for (const {line} of matchingLines) {
        const originalQty = Number(line.pickedQuantity ?? 0);
        const assignedVerified = Math.min(originalQty, remainingVerified);
        line.warehouseVerifiedQuantity = assignedVerified;
        line.returnReason = agg.newReason;
        remainingVerified -= assignedVerified;
      }
      if(remainingVerified !== 0) {
        throw new Error(`Credit Memo verified quantity distribution failed`);
      }
      console.log("CREDIT MEMO RECONCILED: ", {
          inventoryLocation, productId: agg.productId, pickedQty, verifiedQty, newReason: agg.newReason,
      });
    }

    // --- 3. PROCESS PREORDERS ---
    const preorders = await PreOrder.find({_id: {$in: preorderIds}}).session(session);
    type PreorderReturnGroup = {
      inventoryLocation: InventoryLocation;
      inventoryId: string;
      productId: string;
      originalReason: string;
      totalDiff: number;
      lines: Array<{po: any; p: any;}>;
    };
    const preorderGroups = new Map<string, PreorderReturnGroup>();
    for (const po of preorders) {
      if(po.warehouseReturnProcessed) {
        throw new Error(`Preorder ${po.number} has already been processed`);
      }
      const warehouse = resolveWarehouse(po.inventoryLocation);
      const {
        inventoryLocation, InventoryModel, inventoryModelName,
      } = warehouse;
      for (const p of po.products) {
        const picked = Number(p.pickedQuantity ?? 0);
        const delivered = Number(p.deliveredQuantity ?? 0);
        if(!Number.isSafeInteger(picked) || !Number.isSafeInteger(delivered) || picked < 0 || delivered < 0 || delivered > picked) {
          throw new Error(`Invalid quantities in Preorder ${po.number}`);
        }
        const diff = picked - delivered;
        if (diff <= 0) continue;
        if(!p.deviationReason) {
          throw new Error(`Preorder ${po.number} has an undelivered product without a deviation reason`);
        }
        const lineModelName = p.inventoryModel || inventoryModelName;
        if(lineModelName !== inventoryModelName) {
          throw new Error(`Inventory model mismatch for preorder ${po.number}. Expected: ${inventoryModelName}, got: ${lineModelName}`);
        }
        const inventoryId = String(p.productInventory);
        if(!mongoose.isValidObjectId(inventoryId)) {
          throw new Error(`Invalid inventory reference in preorder ${po.number}`);
        }
        const inventory = await InventoryModel.findById(inventoryId).select("product location").session(session);
        if(!inventory) {
          throw new Error(`Inventory ${inventoryId} not found in ${inventoryLocation} for preorder ${po.number}`);
        }
        if(inventoryLocation !== "phoenix" && inventory.location !== inventoryLocation){
          throw new Error(`Foreign inventory location mismatch in preorder ${po.number}`);
        }
        const productId = String(inventory.product);
        const originalReason = p.deviationReason;
        const key = [
          inventoryLocation, inventoryId, originalReason,
        ].join("::");
        if (!preorderGroups.has(key)){
          preorderGroups.set(key, {
            inventoryLocation, inventoryId, productId, originalReason, totalDiff: 0, lines: [],
          });
        }
        const group = preorderGroups.get(key)!;
        group.totalDiff += diff;
        group.lines.push({po, p});
      }
    }
    for (const group of preorderGroups.values()){
      const {inventoryLocation, inventoryId, productId, originalReason} = group;
      const matches = aggregatedProducts.filter((a: any) => ["preorder", "po"].includes(a.sourceType) && String(a.productId) === productId && String(a.inventoryId) === inventoryId && a.originalReason === originalReason && a.inventoryLocation === inventoryLocation);
      if (matches.length !== 1) {
        throw new Error(`Expected exactly one preorder aggregation for ${productId} in ${inventoryLocation}, reason: ${originalReason}. Found: ${matches.length}.`);
      }
      const agg = matches[0];
      const verifiedQty = Number(agg.verifiedQuantity);
      if (!Number.isSafeInteger(verifiedQty) || verifiedQty < 0 || verifiedQty > group.totalDiff) {
        throw new Error(`Invalid verified quantity for product ${productId} in ${inventoryLocation}`);
      }
      if (!["returned", "missing", "damaged"].includes(agg.newReason)) {
        throw new Error(`Invalid reconciliation reason: ${agg.newReason}`);
      }
      const { InventoryModel } = resolveWarehouse(inventoryLocation);
      const update: any = {
        $inc: {onRouteInventory: -group.totalDiff},
      };
      if (agg.newReason === "returned" || agg.newReason === "missing") {
        update.$inc.currentInventory = verifiedQty;
      }
      const inventoryFilter: any = {
        _id: inventoryId,
        product: productId,
        onRouteInventory: {
          $gte: group.totalDiff,
        },
      };
      if (inventoryLocation !== "phoenix") {
        inventoryFilter.location = inventoryLocation;
      }
      const result = await InventoryModel.updateOne(inventoryFilter, update, {session});
      if(result.matchedCount !== 1) {
        throw new Error(`Inventory reconciliation failed for ${productId} in ${inventoryLocation}. Insufficient on-route quantity or missing inventory`);
      }
      for (const { p } of group.lines){
        p.deviationReason = agg.newReason;
      }
      console.log("PREORDER RECONCILED: ", {
        inventoryLocation, inventoryModel: inventoryLocation === "phoenix" ? "ProductInventory" : "ForeignInventory", inventoryId, productId, originalReason, finalReason: agg.newReason, deductedFromRoute: group.totalDiff, restoredToInventory: agg.newReason === "returned" || agg.newReason === "missing" ? verifiedQty : 0,
      });
    }
    for (const po of preorders) {
      po.warehouseReturnProcessed = true;
      await po.save({session});
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

    // ============================================================
// 6. PROCESS ROUTE AUDITS
// Warehouse-aware reconciliation
// ============================================================

const audits = await RouteAudit.find({
  _id: { $in: auditIds },
}).session(session);

if (audits.length !== auditIds.length) {
  throw new Error("One or more Route Audits were not found");
}

const auditGroups = new Map<string, {
  inventoryLocation: string;
  productId: string;
  originalReason: string;
  totalExpected: number;
  lines: Array<{ au: any; p: any; diff: number }>;
}>();

for (const au of audits) {
  if (au.status === "completed") {
    throw new Error(
      `Route Audit ${au._id} is already completed`
    );
  }

  const { inventoryLocation } = getStrictWarehouse(
    au.inventoryLocation
  );

  for (const p of au.products) {
    const signedDiff = Number(p.difference ?? 0);

    if (
      !Number.isSafeInteger(signedDiff)
    ) {
      throw new Error(
        `Invalid difference in Route Audit ${au._id}`
      );
    }

    if (signedDiff === 0) continue;

    if (signedDiff < 0) {
      throw new Error(
        `Route Audit ${au._id} contains extra inventory. ` +
        `Extra-inventory reconciliation must be configured separately.`
      );
    }

    const productId = String(p.product);
    const originalReason = String(p.reason ?? "");

    const key = [
      inventoryLocation,
      productId,
      originalReason,
      "shortage",
    ].join("::");

    if (!auditGroups.has(key)) {
      auditGroups.set(key, {
        inventoryLocation,
        productId,
        originalReason,
        totalExpected: 0,
        lines: [],
      });
    }

    const group = auditGroups.get(key)!;
    group.totalExpected += signedDiff;
    group.lines.push({ au, p, diff: signedDiff });
  }
}

for (const group of auditGroups.values()) {
  const matches = aggregatedProducts.filter(
    (a: any) =>
      ["audit", "au"].includes(a.sourceType) &&
      String(a.productId) === group.productId &&
      a.originalReason === group.originalReason &&
      a.differenceType === "shortage" &&
      a.inventoryLocation === group.inventoryLocation
  );

  if (matches.length !== 1) {
    throw new Error(
      `Expected one Audit aggregation for ` +
      `${group.productId} in ${group.inventoryLocation}`
    );
  }

  const agg = matches[0];
  const verified = Number(agg.verifiedQuantity);

  if (
    !Number.isSafeInteger(verified) ||
    verified < 0 ||
    verified > group.totalExpected ||
    Number(agg.totalPicked) !== group.totalExpected
  ) {
    throw new Error(
      `Invalid Audit quantity for ${group.productId}`
    );
  }

  const { InventoryModel } = getStrictWarehouse(
    group.inventoryLocation
  );

  if (agg.newReason === "returned" && verified > 0) {
    const inventoryFilter: any = {
      product: group.productId,
    };

    if (group.inventoryLocation !== "phoenix") {
      inventoryFilter.location =
        group.inventoryLocation;
    }

    const result = await InventoryModel.updateOne(
      inventoryFilter,
      { $inc: { currentInventory: verified } },
      { session }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Audit inventory not found for ${group.productId} ` +
        `in ${group.inventoryLocation}`
      );
    }
  }

  let remainingVerified = verified;

  for (const { p, diff } of group.lines) {
    const allocated = Math.min(
      diff,
      remainingVerified
    );

    p.newReason = agg.newReason;
    p.verifiedQuantity = allocated;
    remainingVerified -= allocated;
  }

  if (remainingVerified !== 0) {
    throw new Error(
      `Unallocated Audit quantity for ${group.productId}`
    );
  }
}

for (const au of audits) {
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