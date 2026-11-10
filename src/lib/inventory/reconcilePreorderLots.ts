
type LotQuantity = {
    lotId?: any;
    quantity: number;
    lotMatchMethod?: string;
  };
  
  type ReturnReason = "missing" | "returned" | "damaged";
  
  export function reconcilePreorderLots({
    inventory,
    pickedAllocations,
    deliveredAllocations,
    undeliveredQuantity,
    verifiedSellableQuantity,
    reason,
  }: {
    inventory: any;
    pickedAllocations: LotQuantity[];
    deliveredAllocations: LotQuantity[];
    undeliveredQuantity: number;
    verifiedSellableQuantity: number;
    reason: ReturnReason;
  }) {
    if (
      !Number.isSafeInteger(undeliveredQuantity) ||
      undeliveredQuantity < 0 ||
      !Number.isSafeInteger(verifiedSellableQuantity) ||
      verifiedSellableQuantity < 0 ||
      verifiedSellableQuantity > undeliveredQuantity
    ) {
      throw new Error("Invalid return quantities");
    }
  
    if (
      reason === "damaged" &&
      verifiedSellableQuantity !== 0
    ) {
      throw new Error(
        "Damaged inventory cannot be restored as sellable"
      );
    }
  
    // Determine how much was originally picked by lot.
    const remainingByLot = new Map<string, number>();
  
    for (const allocation of pickedAllocations) {
      const key = allocation.lotId
        ? String(allocation.lotId)
        : "fallback";
  
      remainingByLot.set(
        key,
        (remainingByLot.get(key) || 0) +
          Number(allocation.quantity)
      );
    }
  
    // Subtract units that were actually delivered.
    for (const allocation of deliveredAllocations) {
      const key = allocation.lotId
        ? String(allocation.lotId)
        : "fallback";
  
      const remaining = remainingByLot.get(key) ?? 0;
      const quantity = Number(allocation.quantity);
  
      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 0 ||
        quantity > remaining
      ) {
        throw new Error(
          "Delivered lot allocation exceeds picked allocation"
        );
      }
  
      remainingByLot.set(key, remaining - quantity);
    }
  
    const remainingTotal = [...remainingByLot.values()]
      .reduce((sum, qty) => sum + qty, 0);
  
    if (remainingTotal !== undeliveredQuantity) {
      throw new Error(
        `Return quantity mismatch. Expected ` +
        `${undeliveredQuantity}, found ${remainingTotal}`
      );
    }
  
    let sellableRemaining = verifiedSellableQuantity;
  
    for (const [key, quantity] of remainingByLot) {
      if (quantity === 0) continue;
  
      const restored = Math.min(
        quantity,
        sellableRemaining
      );
  
      const writtenOff = quantity - restored;
  
      if (key !== "fallback") {
        const lot = inventory.lots.id(key);
  
        if (!lot) {
          throw new Error(
            `Original lot ${key} not found`
          );
        }
  
        if (
          Number(lot.onRouteReservedQty ?? 0) < quantity ||
          Number(lot.currentQty ?? 0) < writtenOff
        ) {
          throw new Error(
            `Insufficient inventory to reconcile lot ${key}`
          );
        }
  
        // Release all undelivered reservations.
        lot.onRouteReservedQty -= quantity;
  
        // Remove units that cannot return to sellable stock.
        lot.currentQty -= writtenOff;
      }
  
      sellableRemaining -= restored;
    }
  
    if (sellableRemaining !== 0) {
      throw new Error(
        "Could not distribute all verified sellable units"
      );
    }
  }
  