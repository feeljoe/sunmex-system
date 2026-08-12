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

        const currentStart = DateTime.fromISO(startStr, { zone: "America/Phoenix" }).startOf("day").toJSDate();
        const currentEnd = DateTime.fromISO(endStr, { zone: "America/Phoenix" }).endOf("day").toJSDate();
        const prevStart = DateTime.fromISO(prevStartStr, { zone: "America/Phoenix" }).startOf("day").toJSDate();
        const prevEnd = DateTime.fromISO(prevEndStr, { zone: "America/Phoenix" }).endOf("day").toJSDate();

        const todayPhoenix = DateTime.now().setZone("America/Phoenix");
        const todayStart = todayPhoenix.startOf("day").toJSDate();
        const todayEnd = todayPhoenix.endOf("day").toJSDate();

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

        // --- DAILY GROUPINGS (Current) ---
        const preorderDailyPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
        ]);
        const directSaleDailyPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalDirectSaleMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
        ]);
        const creditDailyPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt", timezone: "America/Phoenix" } }, refunds: { $sum: "$total" }, memos: { $sum: 1 } } }
        ]);

        // --- DAILY GROUPINGS (Previous) ---
        const prevPreorderDailyPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
        ]);
        const prevDirectSaleDailyPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
        ]);
        const prevCreditDailyPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt", timezone: "America/Phoenix" } }, refunds: { $sum: "$total" }, memos: { $sum: 1 } } }
        ]);

        // --- PREVIOUS PERIOD TOTALS ---
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

        // --- SALES BY VENDOR ---
        const poVendorsPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchPreorder } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);
        const dsVendorsPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchDirectSale } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 } } }
        ]);
        const poVendorsPrevPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...driverMatchPreorder } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" } } }
        ]);
        const dsVendorsPrevPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...driverMatchDirectSale } },
            { $group: { _id: "$createdBy", rev: { $sum: "$total" } } }
        ]);

        // --- PRODUCT METRICS ---
        const bestSellersPreorderPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { $group: { _id: "$inv.product", qty: { $sum: "$products.deliveredQuantity" } } },
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

        const prevBestSellersPOPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { $group: { _id: "$inv.product", qty: { $sum: "$products.deliveredQuantity" } } }
        ]);
        const prevBestSellersDSPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", qty: { $sum: "$products.quantity" } } }
        ]);
        
        const mostReturnedPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", totalReturned: { $sum: "$products.pickedQuantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalReturned: -1 } },
            { $limit: 50 },
            { $project: { totalReturned: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);
        const prevMostReturnedPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", totalReturned: { $sum: "$products.pickedQuantity" } } }
        ]);

        const deviationsPromise = PreOrder.aggregate([
            { 
                $match: { 
                    status: "delivered", 
                    deliveredAt: { $gte: currentStart, $lte: currentEnd }, 
                    ...globalPreorderMatch, 
                    ...warehouseMatch 
                } 
            },
            { $unwind: "$products" },
            { $match: { "products.deviationReason": { $exists: true, $ne: null } } },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { 
                $group: { 
                    _id: { product: "$inv.product", reason: "$products.deviationReason" }, 
                    totalDeviations: { 
                        // Subtract deliveredQuantity from pickedQuantity
                        $sum: {
                            $subtract: [
                                { $ifNull: ["$products.pickedQuantity", 0] },
                                { $ifNull: ["$products.deliveredQuantity", 0] }
                            ]
                        }
                    } 
                } 
            },
            { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalDeviations: -1 } },
            { $limit: 50 },
            { $project: { reason: "$_id.reason", totalDeviations: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const prevDeviationsPromise = PreOrder.aggregate([
            { 
                $match: { 
                    status: "delivered", 
                    deliveredAt: { $gte: prevStart, $lte: prevEnd }, 
                    ...globalPreorderMatch, 
                    ...warehouseMatch 
                } 
            },
            { $unwind: "$products" },
            { $match: { "products.deviationReason": { $exists: true, $ne: null } } },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { 
                $group: { 
                    _id: { product: "$inv.product", reason: "$products.deviationReason" }, 
                    totalDeviations: { 
                        // Subtract deliveredQuantity from pickedQuantity
                        $sum: {
                            $subtract: [
                                { $ifNull: ["$products.pickedQuantity", 0] },
                                { $ifNull: ["$products.deliveredQuantity", 0] }
                            ]
                        }
                    } 
                } 
            }
        ]);

        // --- ROUTING ---
        const poRoutingPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, $or: [ { status: "ready", deliveryDate: { $gte: todayStart, $lte: todayEnd } }, { status: "ready", deliveryDate: { $gte: currentStart, $lte: currentEnd } }, { status: "delivered", deliveredAt: { $gte: todayStart, $lte: todayEnd } }, { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd } } ] } },
            {
                $group: {
                    _id: "$routeAssigned",
                    onRoute: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", todayStart] }, { $lte: ["$deliveryDate", todayEnd] }] }, 1, 0] } },
                    deliveredToday: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } },
                    deliveredPeriod: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, 1, 0] } },
                    revenueToday: { $sum: { $cond: [ { $or: [ { $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", todayStart] }, { $lte: ["$deliveryDate", todayEnd] }] }, { $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] } ]}, "$total", 0 ] } },
                    revenuePeriod: { $sum: { $cond: [ { $or: [ { $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", currentStart] }, { $lte: ["$deliveryDate", currentEnd] }] }, { $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] } ]}, "$total", 0 ] } }
                }
            }
        ]);

        const dsRoutingPromise = DirectSale.aggregate([
            { $match: { ...globalDirectSaleMatch, status: "delivered", $or: [ { deliveredAt: { $gte: currentStart, $lte: currentEnd } }, { deliveredAt: { $gte: todayStart, $lte: todayEnd } } ] } },
            { 
                $group: {
                    _id: "$route",
                    deliveredToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } },
                    deliveredPeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, 1, 0] } },
                    onRoute: { $sum: 0 },
                    revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, "$total", 0] } },
                    revenuePeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, "$total", 0] } },
                }
            }
        ]);

        // --- WAREHOUSE STATUS & TIMINGS ---
        const pendingAssemblyCount = PreOrder.countDocuments({ status: "assigned", ...globalPreorderMatch });

        const warehouseAssembledPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, ...warehouseMatch, $or: [ { assembledAt: { $gte: currentStart, $lte: currentEnd } }, { assembledAt: { $gte: todayStart, $lte: todayEnd } } ] } },
            {
                $group: {
                    _id: "$assembledBy",
                    assembledPeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", currentStart] }, { $lte: ["$assembledAt", currentEnd] }] }, 1, 0] } },
                    assembledToday: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, 1, 0] } },
                    revenuePeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", currentStart] }, { $lte: ["$assembledAt", currentEnd] }] }, "$total", 0] } },
                    revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, "$subtotal", 0] } }
                }
            }
        ]);
        
        // Needed to fetch previous warehouse revenue
        const prevWarehouseAssembledPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, ...warehouseMatch, assembledAt: { $gte: prevStart, $lte: prevEnd } } },
            { $group: { _id: "$assembledBy", revenuePrev: { $sum: "$total" } } }
        ]);

        const warehouseTimesPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, ...warehouseMatch, assembledAt: { $exists: true, $ne: null }, $or: [ { assembledAt: { $gte: currentStart, $lte: currentEnd } }, { assembledAt: { $gte: todayStart, $lte: todayEnd } } ] } },
            {
                $group: {
                    _id: { user: "$assembledBy", date: { $dateToString: { format: "%Y-%m-%d", date: "$assembledAt", timezone: "America/Phoenix" } } },
                    minTime: { $min: "$assembledAt" },
                    maxTime: { $max: "$assembledAt" },
                    count: { $sum: 1 },
                    isToday: { $max: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, 1, 0] } },
                    isPeriod: { $max: { $cond: [{ $and: [{ $gte: ["$assembledAt", currentStart] }, { $lte: ["$assembledAt", currentEnd] }] }, 1, 0] } }
                }
            },
            {
                $group: {
                    _id: "$_id.user",
                    durationPeriod: { $sum: { $cond: [{ $eq: ["$isPeriod", 1] }, { $subtract: ["$maxTime", "$minTime"] }, 0] } },
                    gapsPeriod: { $sum: { $cond: [{ $and: [{ $eq: ["$isPeriod", 1] }, { $gt: ["$count", 1] }] }, { $subtract: ["$count", 1] }, 0] } },
                    durationToday: { $sum: { $cond: [{ $eq: ["$isToday", 1] }, { $subtract: ["$maxTime", "$minTime"] }, 0] } },
                    gapsToday: { $sum: { $cond: [{ $and: [{ $eq: ["$isToday", 1] }, { $gt: ["$count", 1] }] }, { $subtract: ["$count", 1] }, 0] } }
                }
            }
        ]);

        const prevWarehouseTimesPromise = PreOrder.aggregate([
            { $match: { ...globalPreorderMatch, ...warehouseMatch, assembledAt: { $gte: prevStart, $lte: prevEnd } } },
            {
                $group: {
                    _id: { user: "$assembledBy", date: { $dateToString: { format: "%Y-%m-%d", date: "$assembledAt", timezone: "America/Phoenix" } } },
                    minTime: { $min: "$assembledAt" },
                    maxTime: { $max: "$assembledAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.user",
                    durationPrev: { $sum: { $subtract: ["$maxTime", "$minTime"] } },
                    gapsPrev: { $sum: { $cond: [{ $gt: ["$count", 1] }, { $subtract: ["$count", 1] }, 0] } }
                }
            }
        ]);

        // --- EXECUTE ALL ---
        const [
            poDaily, dsDaily, crDaily,
            prevPoDaily, prevDsDaily, prevCrDaily,
            prevPO, prevDS, prevCR,
            poVendors, dsVendors, poVendorsPrev, dsVendorsPrev,
            bsPO, bsDS, prevBsPO, prevBsDS, mostReturned, prevMostReturned, deviations, prevDeviations,
            poRouting, dsRouting,
            pendingAssm, whStatsRaw, pWhStatsRaw, whTimesRaw, pWhTimesRaw
        ] = await Promise.all([
            preorderDailyPromise, directSaleDailyPromise, creditDailyPromise,
            prevPreorderDailyPromise, prevDirectSaleDailyPromise, prevCreditDailyPromise,
            prevPreordersPromise, prevDirectSalesPromise, prevCreditsPromise,
            poVendorsPromise, dsVendorsPromise, poVendorsPrevPromise, dsVendorsPrevPromise,
            bestSellersPreorderPromise, bestSellersDirectPromise, prevBestSellersPOPromise, prevBestSellersDSPromise, 
            mostReturnedPromise, prevMostReturnedPromise, deviationsPromise, prevDeviationsPromise,
            poRoutingPromise, dsRoutingPromise,
            pendingAssemblyCount, warehouseAssembledPromise, prevWarehouseAssembledPromise, warehouseTimesPromise, prevWarehouseTimesPromise
        ]);

        // --- MERGE LOGIC ---
        const chartData = [];
        let curD = DateTime.fromJSDate(currentStart).setZone("America/Phoenix");
        const endD = DateTime.fromJSDate(currentEnd).setZone("America/Phoenix");
        let pD = DateTime.fromJSDate(prevStart).setZone("America/Phoenix");

        let currentRevenueTotal = 0; let currentOrdersTotal = 0;
        let currentRefundsTotal = 0; let currentMemosTotal = 0;

        while (curD <= endD) {
            const dateStr = curD.toFormat("yyyy-MM-dd");
            const prevDateStr = pD.toFormat("yyyy-MM-dd");

            const po = poDaily.find(x => x._id === dateStr);
            const ds = dsDaily.find(x => x._id === dateStr);
            const cr = crDaily.find(x => x._id === dateStr);
            const pPo = prevPoDaily.find(x => x._id === prevDateStr);
            const pDs = prevDsDaily.find(x => x._id === prevDateStr);
            const pCr = prevCrDaily.find(x => x._id === prevDateStr);

            const rev = (po?.revenue || 0) + (ds?.revenue || 0);
            const ord = (po?.orders || 0) + (ds?.orders || 0);
            const ref = cr?.refunds || 0;
            const mem = cr?.memos || 0;

            const prevRevDaily = (pPo?.revenue || 0) + (pDs?.revenue || 0);
            const prevOrdDaily = (pPo?.orders || 0) + (pDs?.orders || 0);
            const prevRefDaily = (pCr?.refunds || 0);
            const prevMemDaily = (pCr?.memos || 0);

            currentRevenueTotal += rev; currentOrdersTotal += ord;
            currentRefundsTotal += ref; currentMemosTotal += mem;

            chartData.push({
                date: dateStr, displayDate: curD.toFormat("MMM dd"),
                revenue: rev, prevRevenue: prevRevDaily,
                refunds: ref, prevRefunds: prevRefDaily,
                orders: ord, prevOrders: prevOrdDaily,
                aov: (ord + mem) > 0 ? (rev + ref) / (ord + mem) : 0,
                prevAov: (prevOrdDaily + prevMemDaily) > 0 ? (prevRevDaily + prevRefDaily) / (prevOrdDaily + prevMemDaily) : 0
            });
            curD = curD.plus({ days: 1 });
            pD = pD.plus({ days: 1 });
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
            if (!vendorMap.has(id)) vendorMap.set(id, { _id: id, rev: 0, count: 0, prevRev: 0 });
            vendorMap.get(id).rev += v.rev;
            vendorMap.get(id).count += v.count;
        });
        [...poVendorsPrev, ...dsVendorsPrev].forEach(v => {
            const id = v._id?.toString() || "unknown";
            if (!vendorMap.has(id)) vendorMap.set(id, { _id: id, rev: 0, count: 0, prevRev: 0 });
            vendorMap.get(id).prevRev += v.rev;
        });
        let mergedVendors = Array.from(vendorMap.values()).sort((a, b) => b.rev - a.rev);
        const vendorIds = mergedVendors.map(v => v._id).filter(id => id !== "unknown");
        const User = mongoose.model("User");
        const RouteModel = mongoose.model("Route");

        const [users, vendorRoutes] = await Promise.all([
            User.find({ _id: { $in: vendorIds } }).select("firstName lastName"),
            RouteModel.find({ user: { $in: vendorIds } }).select("code user")
        ]);

        mergedVendors = mergedVendors.map(v => {
            const user = users.find(u => u._id.toString() === v._id);
            const route = vendorRoutes.find(r => r.user?.toString() === v._id);
            return { ...v, name: user ? `${user.firstName} ${user.lastName}` : "Unknown", routeName: route ? route.code : "001" };
        });

        const getTrend = (currentRank: number, prevRankArray: any[], idCheckFn: (item: any) => boolean) => {
            const prevIndex = prevRankArray.findIndex(idCheckFn);
            if (prevIndex === -1) return "up";
            if (prevIndex < currentRank) return "down";
            if (prevIndex > currentRank) return "up";
            return "same"; 
        };

        const prevBsMap = new Map();
        [...prevBsPO, ...prevBsDS].forEach(p => {
            const id = p._id.toString();
            if (!prevBsMap.has(id)) prevBsMap.set(id, { _id: id, qty: 0 });
            prevBsMap.get(id).qty += p.qty;
        });
        const prevBestSellersSorted = Array.from(prevBsMap.values()).sort((a, b) => b.qty - a.qty);
        const prevReturnedSorted = [...prevMostReturned].sort((a, b) => b.totalReturned - a.totalReturned);
        const prevDeviationsSorted = [...prevDeviations].sort((a, b) => b.totalDeviations - a.totalDeviations);

        const productMap = new Map();
        [...bsPO, ...bsDS].forEach(p => {
            const id = p._id.toString();
            if (!productMap.has(id)) productMap.set(id, { ...p, qty: 0 });
            productMap.get(id).qty += p.qty;
        });
        
        const mergedBestSellers = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 50).map((p, index) => ({
            ...p, trend: getTrend(index, prevBestSellersSorted, x => x._id?.toString() === p._id?.toString())
        }));
        const mergedMostReturned = mostReturned.map((p, index) => ({
            ...p, trend: getTrend(index, prevReturnedSorted, x => x._id?.toString() === p._id?.toString())
        }));
        const mergedDeviations = deviations.map((p, index) => ({
            ...p, trend: getTrend(index, prevDeviationsSorted, x => x._id?.product?.toString() === p._id?.product?.toString() && x._id?.reason === p.reason)
        }));

        const routeMap = new Map();
        [...poRouting, ...dsRouting].forEach(r => {
            const id = r._id?.toString() || "unassigned";
            if (!routeMap.has(id)) routeMap.set(id, { _id: id, onRoute: 0, deliveredToday: 0, deliveredPeriod: 0, revenueToday: 0, revenuePeriod: 0 });
            const curr = routeMap.get(id);
            curr.onRoute += r.onRoute;
            curr.deliveredToday += r.deliveredToday;
            curr.deliveredPeriod += r.deliveredPeriod;
            curr.revenueToday += r.revenueToday;
            curr.revenuePeriod += r.revenuePeriod;
        });

        let mergedRoutes = Array.from(routeMap.values());
        const routeDocs = await RouteModel.find({ _id: { $in: mergedRoutes.map(r => r._id).filter(id => id !== "unassigned") } }).populate("user", "firstName lastName");

        mergedRoutes = mergedRoutes.map(r => {
            const doc = routeDocs.find(doc => doc._id.toString() === r._id);
            return { ...r, routeName: doc ? doc.code : "Unassigned", driverName: doc?.user ? `${(doc.user as any).firstName} ${(doc.user as any).lastName}` : "No Driver" };
        });

        const totalOnRoute = mergedRoutes.reduce((sum, r) => sum + r.onRoute, 0);
        const totalDeliveredToday = mergedRoutes.reduce((sum, r) => sum + r.deliveredToday, 0);

        const usersToLookup = [...new Set([...whStatsRaw.map(w => w._id?.toString()), ...whTimesRaw.map(w => w._id?.toString())])].filter(Boolean);
        const whUsers = await User.find({ _id: { $in: usersToLookup } }).select("firstName lastName");

        const mergedWarehouse = usersToLookup.map(userId => {
            const user = whUsers.find(u => u._id.toString() === userId);
            const stat = whStatsRaw.find(w => w._id?.toString() === userId) || {};
            const time = whTimesRaw.find(w => w._id?.toString() === userId) || {};
            
            const pStat = pWhStatsRaw.find(w => w._id?.toString() === userId) || {};
            const pTime = pWhTimesRaw.find(w => w._id?.toString() === userId) || {};

            const durationTodayMin = time.durationToday > 0 ? time.durationToday / 60000 : 0;
            const durationPeriodMin = time.durationPeriod > 0 ? time.durationPeriod / 60000 : 0;
            const durationPrevMin = pTime.durationPrev > 0 ? pTime.durationPrev / 60000 : 0;

            const avgTodayMin = time.gapsToday > 0 ? durationTodayMin / time.gapsToday : 0;
            const avgPeriodMin = time.gapsPeriod > 0 ? durationPeriodMin / time.gapsPeriod : 0;
            const avgPrevMin = pTime.gapsPrev > 0 ? durationPrevMin / pTime.gapsPrev : 0;

            return {
                userId,
                userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
                assembledToday: stat.assembledToday || 0,
                assembledPeriod: stat.assembledPeriod || 0,
                revenueToday: stat.revenueToday || 0,
                revenuePeriod: stat.revenuePeriod || 0,
                revenuePrev: pStat.revenuePrev || 0,
                durationTodayMin,
                durationPeriodMin,
                durationPrevMin,
                avgTimeToday: avgTodayMin,
                avgTimePeriod: avgPeriodMin,
                avgTimePrev: avgPrevMin
            };
        });

        const currAssm = mergedWarehouse.reduce((acc, curr) => acc + (curr.assembledToday || 0), 0);

        return NextResponse.json({
            metrics: {
                sales: { current: currentRevenueTotal, previous: pRev },
                credits: { current: currentRefundsTotal, previous: pRef },
                aov: { current: currentAOV, previous: prevAOV },
                ordersDelivered: { current: currentOrdersTotal, previous: pOrd },
                chartData
            },
            warehouse: { pendingAssembly: pendingAssm, assembled: currAssm, byUser: mergedWarehouse },
            today: { totalOnRoute, totalDeliveredToday, byDriver: mergedRoutes },
            vendors: mergedVendors,
            products: { bestSellers: mergedBestSellers, mostReturned: mergedMostReturned, deviations: mergedDeviations }
        });

    } catch (error: any) {
        console.error("Dashboard Aggregation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}