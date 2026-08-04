import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Route from "@/models/Route";


export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;

    const directSale = await DirectSale.findById(id)
    .populate({
      path: "products",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
    })
    .populate("createdBy")
    .populate({
        path: "client",
        populate: {
            path: "billingAddress",
        },
    })
    .populate({
        path: "route",
        populate: {
            path: "user",
        },
    });

    if(!directSale) {
      return NextResponse.json({ error: "Direct Sale Not Found"}, {status: 404});
    }
    return NextResponse.json(directSale);
  } catch(err){
    console.error(err);
    return NextResponse.json({ error: "Server error"}, {status: 500});
  }

}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { client, products } = body;

    const directSale = await DirectSale.findById(id).session(session);
    if (!directSale) {
      throw new Error("Direct Sale not found");
    }

    const route = await Route.findById(directSale.route).session(session);
    if (!route) {
      throw new Error("Original Route not found. Cannot adjust inventory.");
    }

    // 1. Map OLD quantities
    const oldQtyMap = new Map<string, number>();
    directSale.products.forEach((p: any) => {
      oldQtyMap.set(p.product.toString(), p.quantity);
    });

    // 2. Map NEW quantities
    const newQtyMap = new Map<string, number>();
    products.forEach((p: any) => {
      newQtyMap.set(p.product.toString(), p.quantity);
    });

    const allIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    const failedItems: any[] = [];

    // 3. Process Inventory Changes
    for (const productId of allIds) {
      const oldQty = oldQtyMap.get(productId) || 0;
      const newQty = newQtyMap.get(productId) || 0;
      const diff = newQty - oldQty; 

      if (diff === 0) continue;

      // Find the item in the Route's inventory
      const routeItem = route.inventory.find((i: any) => i.product.toString() === productId);

      if (diff > 0) {
        // INCREASING the order -> Deduct more from Route inventory
        if (!routeItem || routeItem.quantity < diff) {
          failedItems.push({
            productId,
            message: "Not enough inventory in route to increase order",
            requested: diff,
            available: routeItem ? routeItem.quantity : 0,
          });
        } else {
          routeItem.quantity -= diff;
        }
      } else if (diff < 0) {
        // DECREASING the order -> Return inventory back to the Route
        const absDiff = Math.abs(diff);
        if (routeItem) {
          routeItem.quantity += absDiff;
        } else {
          // If the product was somehow removed from the route entirely, put it back
          route.inventory.push({ product: productId, quantity: absDiff });
        }
      }
    }

    if (failedItems.length > 0) {
      throw {
        type: "INVENTORY_ERROR",
        message: "Some changes could not be applied due to lack of route inventory.",
        details: failedItems,
      };
    }

    // 4. Update the DirectSale Document
    if (client) directSale.client = client;
    
    directSale.products = products.map((p: any) => ({
      product: p.product,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
    }));

    directSale.total = products.reduce((sum: number, p: any) => sum + (p.quantity * p.unitPrice), 0);

    // Save both documents
    await route.save({ session });
    await directSale.save({ session });

    await session.commitTransaction();
    return NextResponse.json({ success: true });

  } catch (err: any) {
    await session.abortTransaction();
    console.error("PATCH DirectSale error: ", err);

    if (err.type === "INVENTORY_ERROR") {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Unexpected Error" },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}