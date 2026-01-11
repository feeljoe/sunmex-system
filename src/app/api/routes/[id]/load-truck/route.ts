import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import ProductInventory from "@/models/ProductInventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { routeId: string } }) {
  await connectToDatabase();
  const sessionUser = await getServerSession(authOptions);

  if (!sessionUser || (sessionUser?.user?.role !== "admin" && sessionUser?.user?.role !== "onRoute")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { routeId } = params;
  const route = await Route.findById(routeId);
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });

  try {
    // Get all available product inventory
    const products = await ProductInventory.find({ quantity: { $gt: 0 } });

    // Build array to add to route inventory
    const inventoryToAdd = products.map(p => {
      const qty = p.quantity; // Or limit per route if needed
      // Update product onRouteInventory
      p.onRouteInventory.push({ routeId, quantity: qty });
      p.quantity -= qty;
      return {
        product: p._id,
        quantity: qty,
      };
    });

    // Save products
    await Promise.all(products.map(p => p.save()));

    // Add inventory to route
    route.inventory = [...route.inventory, ...inventoryToAdd];
    await route.save();

    return NextResponse.json({ success: true, route });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
