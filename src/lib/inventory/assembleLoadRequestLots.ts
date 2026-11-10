
export function assembleLoadRequestLots(
    inventory: any,
    reservedAllocations: any[],
    assembledQuantity: number
  ) {
    if (
      !Number.isSafeInteger(assembledQuantity) ||
      assembledQuantity < 0
    ) {
      throw new Error("Invalid assembled quantity");
    }
  
    let remaining = assembledQuantity;
    const assembled: any[] = [];
  
    for (const reserved of reservedAllocations) {
      if (remaining === 0) break;
  
      const qty = Math.min(
        Number(reserved.quantity),
        remaining
      );
  
      if (qty <= 0) continue;
  
      const lot = inventory.lots.id(reserved.lotId);
  
      if (!lot) {
        throw new Error(
          `Reserved lot not found: ${reserved.lotId}`
        );
      }
  
      if (
        Number(lot.onRouteReservedQty ?? 0) <
          Number(reserved.quantity)
      ) {
        throw new Error(
          `Lot reservation mismatch: ${reserved.lotId}`
        );
      }
  
      assembled.push({
        lotId: reserved.lotId,
        lotNumber: reserved.lotNumber ?? null,
        quantity: qty,
        unitCost: reserved.unitCost,
        expirationDate:
          reserved.expirationDate ?? null,
      });
  
      lot.hasMovement = true;
      lot.lastMovementAt = new Date();
  
      remaining -= qty;
    }
  
    if (remaining !== 0) {
      throw new Error(
        "Unable to allocate all assembled units"
      );
    }
  
    return assembled;
  }
  