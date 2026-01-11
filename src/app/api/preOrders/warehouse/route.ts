import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("routeAssigned");
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    if(routeId) query.routeAssigned = routeId;
    if(search){
          query.$or = [
            {name: {$regex: search, $options: "i"}},
          ];
        }
    const [items, total] = await Promise.all([
      PreOrder.find({
        routeAssigned: { $ne: null },
        status: { $in: ["assigned"] },
      })
      .populate("client", "clientName")
      .populate("routeAssigned")
      .populate({
        path: "products.productInventory",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
      })
      .populate("cancelledBy")
      .sort({createdAt: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      PreOrder.countDocuments(),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      limit
    });
  }catch(err: any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}
