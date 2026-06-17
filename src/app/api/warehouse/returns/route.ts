import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import { populate } from "dotenv";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const route = searchParams.get("route");

    const cmQuery: any = {
      status: "received" // Only show CMs the driver has already processed
    };

    if (status === "pending") {
      cmQuery.warehouseStatus = "pending";
    } else if (status === "completed") {
      cmQuery.warehouseStatus = "completed";
    }

    if (route) {
      cmQuery.routeAssigned = route;
    }

    const creditMemos = await CreditMemo.find(cmQuery)
      .populate({
        path: "routeAssigned",
        populate: { path: "user", select: "firstName lastName" }
      })
      .populate({
        path: "products.product",
        populate: { path: "brand" }
      })
      .populate("client")
      .populate("createdBy")
      .sort({ createdAt: -1 })
      .lean();

      const formattedCMs = creditMemos.map((cm: any) => ({ ...cm, type: "creditMemo" }));

      const poQuery: any = { status: "delivered" };
      if(status === "pending") poQuery.warehouseReturnProcessed = { $ne: true };
      else if (status === "completed") poQuery.warehouseReturnProcessed = true;
      if(route) poQuery.routeAssigned = route;

      const preorders = await PreOrder.find(poQuery)
        .populate({ path: "routeAssigned", populate: { path: "user", select: "firstName lastName" } })
        .populate({ path: "products.productInventory", populate: { path: "product", populate: { path: "brand" } } })
        .populate("client")
        .populate("createdBy")
        .sort({ deliveredAt: -1 })
        .lean();

        const formattedPreorders = preorders
            .filter((po: any) => po.products.some((p: any) => (p.pickedQuantity || 0) > (p.deliveredQuantity || 0)))
            .map((po: any) => ({ ...po, type: "preorder" }));

    // useList expects an object with 'items'
    return NextResponse.json({
      items: [...formattedCMs, ...formattedPreorders],
      total: formattedCMs.length + formattedPreorders.length
    });

  } catch (error: any) {
    console.error("Warehouse returns fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}