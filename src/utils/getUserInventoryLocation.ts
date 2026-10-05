import User from "@/models/User";
import { normalizeInventoryLocation, InventoryLocation } from "./inventoryResolver";

export async function getUserInventoryLocation(userId?:string | null): Promise<InventoryLocation> {
    if(!userId){
        return "phoenix";
    }
    const user = await User.findById(userId).select("location").lean();

    return normalizeInventoryLocation(user?.location);
}