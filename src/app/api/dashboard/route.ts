import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import DirectSale from "@/models/DirectSale";
import Route from "@/models/Route";
import { DateTime } from "luxon";
import mongoose from "mongoose";

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);

        const startStr = searchParams.get("startDate");
        const endStr = searchParams.get("endDate");
        const prevStartStr = searchParams.get("prevStartDate");
        const prevEndStr = searchParams.get("prevEndDate");
        const vendorId = searchParams.get("vendorId");
        const driverId = searchParams.get("driverId");
        const warehouseId = searchParams.get("warehouseId");

        if (!startStr || !endStr || !prevStartStr || !prevEndStr) {
            return NextResponse.json({ error: "Missing date ranges" }, { status: 400 });
        }

        const currentStart = new Date(startStr);
        const currentEnd = new Date(endStr);
        const prevStart = new Date(prevStartStr);
        const prevEnd = new Date(prevEndStr);

        const todayPhoenix = DateTime.now().setZone("America/Phoenix");
        const todayStart = todayPhoenix.startOf("day").toJSDate();
        const todayEnd = todayPhoenix.endOf("day").toJSDate();

        // --- FILTERS ---
        const vendorMatch = vendorId ? { createdBy: new mongoose.Types.ObjectId(vendorId) } : {};
        const warehouseMatch = warehouseId ? { assembledBy: new mongoose.Types.ObjectId(warehouseId) } : {};
        
        let driverMatchPreorder = {};
        let driverMatchDirectSale = {};
        
        if (driverId) {
            const routes = await Route.find({ user: driverId }).select("_id");
            const routeIds = routes.map(r => r._id);
            driverMatchPreorder = { routeAssigned: { $in: routeIds } };
            driverMatchDirectSale = { route: { $in: routeIds } };
        }

        const globalPreorderMatch = { ...vendorMatch, ...driverMatchPreorder };
        const globalDirectSaleMatch = { ...vendorMatch, ...driverMatchDirectSale };

        // ==========================================
        // PIPELINES: Daily Groupings (For Charts)
        // ==========================================
        const preorderDailyPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 }
            }}
        ]);

        const directSaleDailyPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalDirectSaleMatch } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 }
            }}
        ]);

        const creditDailyPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt", timezone: "America/Phoenix" } },
                refunds: { $sum: "$total" },
                memos: { $sum: 1 }
            }}
        ]);

        // ==========================================
        // PIPELINES: Previous Period Totals
        // ==========================================
        const prevPreordersPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $group: { _id: null, rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);
        const prevDirectSalesPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } },
            { $group: { _id: null, rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);
        const prevCreditsPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $group: { _id: null, ref: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);

        // ==========================================
        // PIPELINES: Sales by Vendor
        // ==========================================
        const poVendorsPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchPreorder } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);
        const dsVendorsPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchDirectSale } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);

        // ==========================================
        // PIPELINES: Product Metrics (Fetch 50, UI slices them)
        // ==========================================
        const bestSellersPreorderPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { $group: { _id: "$inv.product", qty: { $sum: "$products.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $project: { qty: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const bestSellersDirectPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalDirectSaleMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", qty: { $sum: "$products.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $project: { qty: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const mostReturnedPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", totalReturned: { $sum: "$products.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalReturned: -1 } },
            { $limit: 50 },
            { $project: { totalReturned: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const deviationsPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $match: { "products.deviationReason": { $exists: true, $ne: null } } },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { $group: { _id: { product: "$inv.product", reason: "$products.deviationReason" }, totalDeviations: { $sum: "$products.quantity" } } },
            { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalDeviations: -1 } },
            { $limit: 50 },
            { $project: { reason: "$_id.reason", totalDeviations: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        // ==========================================
        // PIPELINES: Routing & Warehouse
        // ==========================================
        const poRoutingPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, $or: [
                { status: "ready", deliveryDate: { $gte: todayStart, $lte: todayEnd } }, 
                { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd } }
            ]}},
            { $group: {
                _id: "$routeAssigned",
                onRoute: { $sum: { $cond: [{ $eq: ["$status", "ready"] }, 1, 0] } },
                deliveredToday: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } },
                deliveredPeriod: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }
            }}
        ]);

        const dsRoutingPromise = DirectSale.aggregate([
            { $match: { ...globalDirectSaleMatch, status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd } }},
            { $group: {
                _id: "$route",
                deliveredToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } },
                deliveredPeriod: { $sum: 1 },
                onRoute: { $sum: 0 }
            }}
        ]);

        const pendingAssemblyCount = PreOrder.countDocuments({ status: "assigned", ...globalPreorderMatch });
        const currentlyAssembledCount = PreOrder.countDocuments({
            status: "ready",
            $or: [
                { deliveryDate: { $lt: todayStart } },
                { deliveryDate: { $gt: todayEnd } },
                { deliveryDate: null }
            ],
            ...globalPreorderMatch
        });
        
        const warehouseAssembledPromise = PreOrder.aggregate([
            { $match: { assembledAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch, ...warehouseMatch } },
            { $group: {
                _id: "$assembledBy",
                assembledPeriod: { $sum: 1 },
                assembledToday: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, 1, 0] } }
            }},
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { assembledPeriod: 1, assembledToday: 1, userName: { $concat: ["$user.firstName", " ", "$user.lastName"] } } }
        ]);

        // --- EXECUTE ALL ---
        const [
            poDaily, dsDaily, crDaily,
            prevPO, prevDS, prevCR,
            poVendors, dsVendors,
            bsPO, bsDS, mostReturned, deviations,
            poRouting, dsRouting,
            pendingAssm, currAssm, whStats
        ] = await Promise.all([
            preorderDailyPromise, directSaleDailyPromise, creditDailyPromise,
            prevPreordersPromise, prevDirectSalesPromise, prevCreditsPromise,
            poVendorsPromise, dsVendorsPromise,
            bestSellersPreorderPromise, bestSellersDirectPromise, mostReturnedPromise, deviationsPromise,
            poRoutingPromise, dsRoutingPromise,
            pendingAssemblyCount, currentlyAssembledCount, warehouseAssembledPromise
        ]);

        // --- MERGE LOGIC ---
        const chartData = [];
        let curD = DateTime.fromJSDate(currentStart).setZone("America/Phoenix");
        const endD = DateTime.fromJSDate(currentEnd).setZone("America/Phoenix");

        let currentRevenueTotal = 0; let currentOrdersTotal = 0;
        let currentRefundsTotal = 0; let currentMemosTotal = 0;

        while (curD <= endD) {
            const dateStr = curD.toFormat("yyyy-MM-dd");
            const po = poDaily.find(x => x._id === dateStr);
            const ds = dsDaily.find(x => x._id === dateStr);
            const cr = crDaily.find(x => x._id === dateStr);

            const rev = (po?.revenue || 0) + (ds?.revenue || 0);
            const ord = (po?.orders || 0) + (ds?.orders || 0);
            const ref = cr?.refunds || 0;
            const mem = cr?.memos || 0;

            currentRevenueTotal += rev; currentOrdersTotal += ord;
            currentRefundsTotal += ref; currentMemosTotal += mem;

            chartData.push({
                date: dateStr,
                displayDate: curD.toFormat("MMM dd"),
                revenue: rev,
                refunds: ref,
                orders: ord,
                aov: (ord + mem) > 0 ? (rev + ref) / (ord + mem) : 0
            });
            curD = curD.plus({ days: 1 });
        }

        const pRev = (prevPO[0]?.rev || 0) + (prevDS[0]?.rev || 0);
        const pOrd = (prevPO[0]?.count || 0) + (prevDS[0]?.count || 0);
        const pRef = prevCR[0]?.ref || 0;
        const pMem = prevCR[0]?.count || 0;

        const currentAOV = (currentOrdersTotal + currentMemosTotal) > 0 ? (currentRevenueTotal + currentRefundsTotal) / (currentOrdersTotal + currentMemosTotal) : 0;
        const prevAOV = (pOrd + pMem) > 0 ? (pRev + pRef) / (pOrd + pMem) : 0;

        const vendorMap = new Map();
        [...poVendors, ...dsVendors].forEach(v => {
            const id = v._id?.toString() || "unknown";
            if (!vendorMap.has(id)) vendorMap.set(id, { _id: id, rev: 0, count: 0 });
            const curr = vendorMap.get(id);
            curr.rev += v.rev;
            curr.count += v.count;
        });
        
        let mergedVendors = Array.from(vendorMap.values()).sort((a, b) => b.rev - a.rev);
        const vendorIds = mergedVendors.map(v => v._id).filter(id => id !== "unknown");
        const User = mongoose.model("User");
        const users = await User.find({ _id: { $in: vendorIds } }).select("firstName lastName");
        mergedVendors = mergedVendors.map(v => {
            const user = users.find(u => u._id.toString() === v._id);
            return { ...v, name: user ? `${user.firstName} ${user.lastName}` : "Unknown" };
        });

        const productMap = new Map();
        [...bsPO, ...bsDS].forEach(p => {
            const id = p._id.toString();
            if (!productMap.has(id)) productMap.set(id, { ...p, qty: 0 });
            productMap.get(id).qty += p.qty;
        });
        // Send up to 50 back, UI handles slicing
        const mergedBestSellers = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 50);

        const routeMap = new Map();
        [...poRouting, ...dsRouting].forEach(r => {
            const id = r._id?.toString() || "unassigned";
            if (!routeMap.has(id)) routeMap.set(id, { _id: id, onRoute: 0, deliveredToday: 0, deliveredPeriod: 0 });
            const curr = routeMap.get(id);
            curr.onRoute += r.onRoute;
            curr.deliveredToday += r.deliveredToday;
            curr.deliveredPeriod += r.deliveredPeriod;
        });
        
        let mergedRoutes = Array.from(routeMap.values());
        const RouteModel = mongoose.model("Route");
        const routeDocs = await RouteModel.find({ _id: { $in: mergedRoutes.map(r => r._id).filter(id => id !== "unassigned") } }).populate("user", "firstName lastName");
        
        mergedRoutes = mergedRoutes.map(r => {
            const doc = routeDocs.find(doc => doc._id.toString() === r._id);
            return {
                ...r,
                routeName: doc ? doc.code : "Unassigned",
                driverName: doc?.user ? `${(doc.user as any).firstName} ${(doc.user as any).lastName}` : "No Driver"
            };
        });

        const totalOnRoute = mergedRoutes.reduce((sum, r) => sum + r.onRoute, 0);
        const totalDeliveredToday = mergedRoutes.reduce((sum, r) => sum + r.deliveredToday, 0);

        return NextResponse.json({
            metrics: {
                sales: { current: currentRevenueTotal, previous: pRev },
                credits: { current: currentRefundsTotal, previous: pRef },
                aov: { current: currentAOV, previous: prevAOV },
                ordersDelivered: { current: currentOrdersTotal, previous: pOrd },
                chartData
            },
            warehouse: {
                pendingAssembly: pendingAssm,
                assembled: currAssm,
                byUser: whStats
            },
            today: {
                totalOnRoute,
                totalDeliveredToday,
                byDriver: mergedRoutes
            },
            vendors: mergedVendors,
            products: {
                bestSellers: mergedBestSellers,
                mostReturned,
                deviations
            }
        });

    } catch (error: any) {
        console.error("Dashboard Aggregation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}