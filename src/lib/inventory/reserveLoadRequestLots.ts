
import mongoose from "mongoose";

export type LoadRequestLotAllocation = {
  lotId: mongoose.Types.ObjectId;
  lotNumber: string | null;
  quantity: number;
  unitCost: number;
  expirationDate: Date | null;
};

export function reserveLoadRequestLots(
  inventory: any,
  requestedQuantity: number
): LoadRequestLotAllocation[] {
  if (
    !Number.isSafeInteger(requestedQuantity) ||
    requestedQuantity < 0
  ) {
    throw new Error("Invalid load request quantity");
  }

  if (requestedQuantity === 0) return [];

  const lots = [...(inventory.lots ?? [])].sort(
    (a: any, b: any) => {
      const first = new Date(a.receivedAt ?? 0).getTime();
      const second = new Date(b.receivedAt ?? 0).getTime();

      return first - second;
    }
  );

  let remaining = requestedQuantity;

  const allocations: LoadRequestLotAllocation[] = [];

  for (const lot of lots) {
    if (remaining === 0) break;

    const currentQty = Number(lot.currentQty ?? 0);
    const reservedQty = Number(
      lot.onRouteReservedQty ?? 0
    );
    const cost = Number(lot.cost);

    if (
      !Number.isSafeInteger(currentQty) ||
      !Number.isSafeInteger(reservedQty) ||
      currentQty < 0 ||
      reservedQty < 0 ||
      reservedQty > currentQty ||
      !Number.isFinite(cost) ||
      cost < 0
    ) {
      throw new Error(
        `Invalid inventory lot: ${lot.lotNumber ?? lot._id}`
      );
    }

    const availableQty = currentQty - reservedQty;

    if (availableQty <= 0) continue;

    const qtyToReserve = Math.min(
      remaining,
      availableQty
    );

    lot.onRouteReservedQty =
      reservedQty + qtyToReserve;

    allocations.push({
      lotId: lot._id,
      lotNumber: lot.lotNumber ?? null,
      quantity: qtyToReserve,
      unitCost: cost,
      expirationDate: lot.expirationDate ?? null,
    });

    remaining -= qtyToReserve;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient available lot inventory. ` +
      `Requested: ${requestedQuantity}; ` +
      `unallocated: ${remaining}.`
    );
  }

  return allocations;
}
