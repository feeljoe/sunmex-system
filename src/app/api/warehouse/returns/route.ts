import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import LoadRequest from "@/models/LoadRequest";
import RouteAudit from "@/models/RouteAudit";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const route = searchParams.get("route");

    const phoenixNow = DateTime.now().setZone("America/Phoenix");
    const startOfDay = phoenixNow.startOf("day").toUTC().toJSDate();
    const endOfDay = phoenixNow.endOf("day").toUTC().toJSDate();

    // --- CREDIT MEMOS ---
    const cmQuery: any = {
      status: "received", 
      directSale: null, 
      routeAssigned: {$exists: true, $ne: null},
      $or: [
        { warehouseStatus: "pending", returnedAt: {$gte: startOfDay, $lte: endOfDay } },
        { warehouseStatus: "completed", warehouseReceivedAt: {$gte: startOfDay, $lte: endOfDay } }
      ]
    };
    if (route) cmQuery.routeAssigned = route;

    const creditMemos = await CreditMemo.find(cmQuery)
      .populate({ path: "routeAssigned", populate: { path: "user", select: "firstName lastName" } })
      .populate({ path: "products.product", populate: { path: "brand" } })
      .populate("client")
      .populate("createdBy")
      .sort({ createdAt: -1 })
      .lean();

    const formattedCMs = creditMemos
      .filter((cm: any) => cm.routeAssigned?.type !== "vendor")
      .map((cm: any) => ({ 
        ...cm, 
        type: "creditMemo",
        status: cm.warehouseStatus === "completed" ? "completed" : "pending"
      }));

    // --- PREORDERS ---
    const poQuery: any = { 
      status: "delivered", routeAssigned: {$exists: true, $ne: null}, deliveredAt: { $gte: startOfDay, $lte: endOfDay }
    };
    if(route) poQuery.routeAssigned = route;
    poQuery.$or = [{ warehouseReturnProcessed: { $ne: true } }, { warehouseReturnProcessed: true }];

    const preorders = await PreOrder.find(poQuery)
      .populate({ path: "routeAssigned", populate: { path: "user", select: "firstName lastName" } })
      .populate({ path: "products.productInventory", populate: { path: "product", populate: { path: "brand" } } })
      .populate("client")
      .populate("createdBy")
      .sort({ deliveredAt: -1 })
      .lean();

    const formattedPreorders = preorders
      .filter((po: any) => {
        if (po.routeAssigned?.type === "vendor") return false;
        if(!po.warehouseReturnProcessed) {
          return po.products.some((p: any) => (p.pickedQuantity || 0) > (p.deliveredQuantity || 0));
        }
        return true;
      })
      .map((po: any) => ({ 
        ...po, 
        type: "preorder",
        status: po.warehouseReturnProcessed ? "completed": "pending"
      }));

    // --- LOAD REQUESTS ---
    const lrQuery: any = { 
      status: "delivered", routeAssigned: {$exists: true, $ne: null}, updatedAt: { $gte: startOfDay, $lte: endOfDay }
    };
    if(route) lrQuery.routeAssigned = route;
    lrQuery.$or = [{ warehouseReturnProcessed: { $ne: true } }, { warehouseReturnProcessed: true }];

    const loadRequests = await LoadRequest.find(lrQuery)
      .populate({ path: "routeAssigned", populate: { path: "user", select: "firstName lastName" } })
      .populate({ path: "products.product", populate: { path: "brand" } })
      .populate("requestedBy")
      .sort({ deliveredAt: -1 })
      .lean();

    const formattedLRs = loadRequests
      .filter((lr: any) => {
        if(!lr.warehouseReturnProcessed) {
          return lr.products.some((p: any) => (p.assembledQuantity || 0) > (p.deliveredQuantity || 0));
        }
        return true;
      })
      .map((lr: any) => ({ 
        ...lr, 
        type: "loadRequest",
        status: lr.warehouseReturnProcessed ? "completed": "pending"
      }));

    // --- ROUTE AUDITS ---
    const auditQuery: any = {
      routeAssigned: {$exists: true, $ne: null},
      $or: [
        { status: "pending", createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { status: "completed", warehouseReceivedAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    };
    if (route) auditQuery.routeAssigned = route;

    const audits = await RouteAudit.find(auditQuery)
      .populate({ path: "routeAssigned", populate: { path: "user", select: "firstName lastName" } })
      .populate({ path: "products.product", populate: { path: "brand" } })
      .populate("createdBy")
      .sort({ createdAt: -1 })
      .lean();

    const formattedAudits = audits.map((au: any) => ({ ...au, type: "audit" }));

    return NextResponse.json({
      items: [...formattedCMs, ...formattedPreorders, ...formattedLRs, ...formattedAudits],
      total: formattedCMs.length + formattedPreorders.length + formattedLRs.length + formattedAudits.length
    });

  } catch (error: any) {
    console.error("Warehouse returns fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}