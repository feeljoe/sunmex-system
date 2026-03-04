import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  await connectToDatabase();

  try {
    const { routeId, preorderIds } = await req.json();

    if (!routeId || !Array.isArray(preorderIds) || preorderIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    const preorders = await PreOrder.find({
      _id: { $in: preorderIds },
    }).populate("client");

    for (const preorder of preorders) {
      const newStatus =
        preorder.status === "ready"
          ? preorder.status
          : "assigned";

      preorder.routeAssigned = route._id;
      preorder.status = newStatus;
      await preorder.save();

      const clientId =
        typeof preorder.client === "object"
          ? preorder.client._id
          : preorder.client;

      const pendingCreditMemo = await CreditMemo.findOne({
        client: clientId, 
        status: "pending",
      });
      if(pendingCreditMemo){
      pendingCreditMemo.routeAssigned = route._id;
      pendingCreditMemo.preorder = preorder._id;
      await pendingCreditMemo.save();
      }
    }

    return NextResponse.json(
      { success: true, count: preorders.length },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Bulk assign error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}