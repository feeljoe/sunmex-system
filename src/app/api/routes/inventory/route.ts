import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Find routes where the inventory array is not empty
    const routes = await Route.find({ 
      'inventory.0': { $exists: true } 
    })
    .populate("user", "firstName lastName")
    .populate({
      path: "inventory.product",
      populate: { path: "brand"},
    })
    .lean();

    // 2. Map through the routes to calculate the summaries
    const summaryData = routes.map((route: any) => {
      let totalQuantity = 0;
      let totalValue = 0;

      route.inventory.forEach((item: any) => {
        if (!item.product) return; // Skip if product was deleted from DB

        const qty = item.quantity || 0;
        // Use actualCost, fallback to price, fallback to 0
        const itemValue = item.product.unitCost || 0; 

        totalQuantity += qty;
        totalValue += (qty * itemValue);
      });

      return {
        _id: route._id,
        code: route.code,
        user: route.user,
        totalQuantity,
        totalValue,
        // Pass the raw inventory array so the frontend modal can display the details without another fetch
        detailedInventory: route.inventory 
      };
    });

    // Sort by route code
    summaryData.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ items: summaryData });
  } catch (error: any) {
    console.error("Route Inventory API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}