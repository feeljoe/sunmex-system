// /api/preorders/[id]/assign-route/route.ts
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import { NextResponse } from "next/server";
import CreditMemo from "@/models/CreditMemo";

export async function PATCH(
  req: Request
) {
    await connectToDatabase();
  try {
    const { routeId, preorderId } = await req.json();

    // validate route exists
    const route = await Route.findById(routeId);
    if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });
    // Find preorder first
    const preorder = await PreOrder.findById(preorderId);
    if (!preorder) {
      return NextResponse.json(
        { error: "Preorder not found" },
        { status: 404 }
      );
    }

    const newStatus = preorder.status === "ready" ? preorder.status : "assigned";

    preorder.routeAssigned = route._id;
    preorder.status = newStatus;
    await preorder.save();

    await preorder.populate("client");
    await preorder.populate({
       path: "products.productInventory",
       populate: { path: "product" }
     });

     const clientId = typeof preorder.client === "object" ? preorder.client._id : preorder.client;

     await CreditMemo.updateMany(
      { client: clientId, status: "pending"},
      { $set: { routeAssigned: route._id } }
     );

    if (!preorder) return NextResponse.json({ error: "Preorder not found" }, { status: 404 });

    return NextResponse.json(preorder, { status: 200 });
  } catch (err: any) {
    console.error("Assign route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
