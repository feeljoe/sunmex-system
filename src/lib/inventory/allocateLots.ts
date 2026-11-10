type InventoryLot = {
    _id: any;
    lotNumber?: string;
    cost?: number;
    currentQty?: number;
    onRouteReservedQty?: number;
    receivedAt?: Date;
    expirationDate?: Date | null;
};

export function allocateLotsForPicking(lots: InventoryLot[], quantity: number, inventoryLocation: string) {
    if(!Number.isSafeInteger(quantity) || quantity < 0) {
        throw new Error("Invalid picked quantity");
    }
    let remaining = quantity;
    const allocations: any[] = [];
    const sortedLots = [...lots].sort((a, b) => 
        new Date(a.receivedAt ?? 0).getTime() - new Date(b.receivedAt ?? 0).getTime());
    for (const lot of sortedLots) {
        if(remaining <=0) break;
        const currentQty = Number(lot.currentQty ?? 0);
        const reservedQty = Number(lot.onRouteReservedQty ?? 0);

        const availableQty = Math.max(0, currentQty - reservedQty);
        if(availableQty <= 0) continue;

        const quantityToReserve = Math.min(availableQty, remaining);

        const unitCost = Number(lot.cost);
        if(!Number.isFinite(unitCost) || unitCost < 0) {
            throw new Error(`Invalid cost for lot ${lot.lotNumber}`);
        }
        allocations.push({
            lotId: lot._id,
            lotNumber: lot.lotNumber ?? null,
            quantity: quantityToReserve,
            unitCost,
            expirationDate: lot.expirationDate ?? null,
            inventoryLocation,
            lotMatchMethod: "fifo",
        });

        lot.onRouteReservedQty = reservedQty + quantityToReserve;
        remaining -= quantityToReserve;
    }
    return {
        allocations, remaining,
    };
}