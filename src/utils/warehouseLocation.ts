export const WAREHOUSE_LOCATIONS = [
    "phoenix",
    "tucson",
    "yuma",
    "elPaso",
    "lasVegas",
  ] as const;
  
  export type WarehouseLocation =
    (typeof WAREHOUSE_LOCATIONS)[number];
  
  export function normalizeWarehouseLocation(
    location: unknown
  ): WarehouseLocation {
    if (typeof location !== "string") {
      throw new Error(
        "Missing or invalid warehouse location"
      );
    }
  
    const normalized = location
      .trim()
      .replace(/[\s_-]/g, "")
      .toLowerCase();
  
    const locations: Record<string, WarehouseLocation> = {
      phoenix: "phoenix",
      tucson: "tucson",
      yuma: "yuma",
      elpaso: "elPaso",
      lasvegas: "lasVegas",
    };
  
    const result = locations[normalized];
  
    if (!result) {
      throw new Error(
        `Unknown warehouse location: ${location}`
      );
    }
  
    return result;
  }