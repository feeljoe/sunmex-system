import ProductInventory from "@/models/ProductInventory";
import ForeignInventory from "@/models/ForeignInventory";

export const FOREIGN_LOCATIONS = [
    "yuma", "tucson", "elPaso", "lasVegas",
] as const;

export type InventoryLocation = | "phoenix" | "yuma" | "tucson" | "elPaso" | "lasVegas";

export type InventoryModelName = | "ProductInventory" | "ForeignInventory";

export function normalizeInventoryLocation(location?:string | null): InventoryLocation {
    if(location && FOREIGN_LOCATIONS.includes(location as any)) {
        return location as InventoryLocation;
    }
    return "phoenix";
}

export function isForeignInventoryLocation(location?:string | null) {
    return (!!location && FOREIGN_LOCATIONS.includes(location as any));
}

export function getInventoryModel(location?:string | null) {
    const inventoryLocation = normalizeInventoryLocation(location);
    if(inventoryLocation === "phoenix"){
        return ProductInventory;
    }
    return ForeignInventory;
}

export function getInventoryModelName(location?:string | null): InventoryModelName {
    return normalizeInventoryLocation(location) === "phoenix"
    ? "ProductInventory"
    : "ForeignInventory";
}

export function getInventoryQuery(location?:string | null) {
    const inventoryLocation = normalizeInventoryLocation(location);

    if(inventoryLocation === "phoenix") {
        return {};
    }
    return {
        location: inventoryLocation,
    };
}