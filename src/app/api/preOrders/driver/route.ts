import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request){
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const session = await getServerSession(authOptions);
    if(!session?.user){
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const baseQuery: any = {
        status: {$in: ["ready", "delivered"]},
        routeAssigned: {$ne: null},
        deliveryDate: {
            $gte: startOfToday,
            $lte: endOfToday,
        },
    };
    if(fromDate && toDate){
        const [fy, fm, fd] = fromDate.split("-").map(Number);
        const [ty, tm, td] = toDate.split("-").map(Number);
        const start = new Date(fy, fm-1, fd, 0, 0, 0, 0);
        const end = new Date(ty, tm-1, td, 23, 59, 59, 999);
        baseQuery.deliveryDate = {
          $gte: start,
          $lte: end,
        };
      }

    if(session.user.role === "driver"){
        const route = await Route.findOne({
            type: "driver",
            user: session.user.id,
        });
        if(!route){
            return NextResponse.json({
                items: [],
                total: 0,
                page,
                limit,
            });
        }

        baseQuery.routeAssigned = route._id;
    }

    const [items, total] = await Promise.all([
    PreOrder.find(baseQuery)
    .populate('client')
    .populate('routeAssigned')
    .populate({
        path: "products.productInventory",
        populate:{
            path: "product",
            populate: { path: "brand"},
        },
    })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),
    PreOrder.countDocuments(),
  ]);

  const clientIds = items.map(p => p.client?._id);
  const routeIds = items.map(p => p.routeAssigned?._id);

  const creditMemos = await CreditMemo.find({
    client: { $in: clientIds },
    routeAssigned: { $in: routeIds },
    status: "pending",
  })
  .populate("client")
  .populate("routeAssigned")
  .populate({
    path: "products",
    populate:{
        path: "product",
        populate: { path: "brand"},
    },
    })
    .lean();

const creditMemoMap = new Map<string, any>();
creditMemos.forEach(cm => {
    creditMemoMap.set(
        `${cm.client._id}-${cm.routeAssigned._id}`,
        cm
    );
});

const enriched = items.map(p => ({
    ...p,
    creditMemo:
        creditMemoMap.get(`${p.client._id}-${p.routeAssigned._id}`) || null,
}));

  return NextResponse.json({
    items: enriched,
    total,
    page,
    limit
  });
}