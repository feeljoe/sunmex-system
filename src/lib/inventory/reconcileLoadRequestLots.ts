
type Allocation = {
    lotId: any;
    quantity: number;
  };
  
  function allocationMap(allocations: Allocation[]) {
    const map = new Map<string, number>();
  
    for (const allocation of allocations) {
      const id = String(allocation.lotId);
      const qty = Number(allocation.quantity);
  
      if (
        !id ||
        !Number.isSafeInteger(qty) ||
        qty <= 0 ||
        map.has(id)
      ) {
        throw new Error("Invalid or duplicate lot allocation");
      }
  
      map.set(id, qty);
    }
  
    return map;
  }
  
  export function getOutstandingLoadRequestLots(
    line: any
  ) {
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
      throw new Error("Invalid load request quantities");
    }
  
    const reserved = allocationMap(
      line.reservedLotAllocations ?? []
    );
  
    const deliveredLots = allocationMap(
      line.lotAllocations ?? []
    );
  
    const totalReserved = [...reserved.values()].reduce(
      (sum, qty) => sum + qty, 0
    );
  
    const totalDelivered = [...deliveredLots.values()].reduce(
      (sum, qty) => sum + qty, 0
    );
  
    if (
      totalReserved !== approved ||
      totalDelivered !== delivered
    ) {
      throw new Error(
        "Load request lot allocation totals do not match"
      );
    }
  
    const assembledByLot = allocationMap(
        line.assembledLotAllocations ?? []
      );
      
      const totalAssembled = [...assembledByLot.values()].reduce(
        (sum, qty) => sum + qty,
        0
      );
      
      if (totalAssembled !== assembled) {
        throw new Error(
          "Assembled lot quantities do not match assembled quantity"
        );
      }
  
    const outstanding: Array<{
      lotId: string;
      reservedRemaining: number;
      onRouteRemaining: number;
      unassembled: number;
    }> = [];
  
    for (const [id, quantity] of reserved) {
      const assembledQty = assembledByLot.get(id) ?? 0;
      const deliveredQty = deliveredLots.get(id) ?? 0;

      if (assembledQty > quantity) {
        throw new Error(
          `Assembled lot ${id} exceeds approved reservation`
        );
      }
  
      if (deliveredQty > assembledQty) {
        throw new Error(
          `Delivered allocations exceed assembled lot ${id}`
        );
      }
  
      outstanding.push({
        lotId: id,
        reservedRemaining: quantity - deliveredQty,
        onRouteRemaining: assembledQty - deliveredQty,
        unassembled: quantity - assembledQty,
      });
    }

    for (const id of assembledByLot.keys()) {
        if (!reserved.has(id)) {
          throw new Error(
            `Assembled lot ${id} was not approved`
          );
        }
      }
  
    for (const id of deliveredLots.keys()) {
      if (!reserved.has(id)) {
        throw new Error(
          `Delivered lot ${id} was not originally reserved`
        );
      }
    }
  
    return outstanding;
  }
  