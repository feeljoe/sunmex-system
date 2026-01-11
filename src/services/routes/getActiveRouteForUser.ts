import Route from "@/models/Route";

export async function getActiveRouteForUser(userId: string) {
    return Route.findOne({
        active: true,
        $or: [
            {user: userId},
            {activeDriver: userId}
        ],
        inventory: {$exists: true, $ne: []},
    }).populate("inventory.product");
}