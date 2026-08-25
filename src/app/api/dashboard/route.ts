import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import DirectSale from "@/models/DirectSale";
import Route from "@/models/Route";
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

        const todayStart = new Date(new Date().setHours(0,0,0,0));
        const todayEnd = new Date(new Date().setHours(23,59,59,999));

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

        // --- 1. DAILY GROUPINGS (Current vs Previous) ---
        const preorderDailyPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]);
        const directSaleDailyPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalDirectSaleMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]);
        const creditDailyPromise = CreditMemo.aggregate([{ $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt", timezone: "America/Phoenix" } }, refunds: { $sum: "$total" }, memos: { $sum: 1 } } }]);

        const prevPreorderDailyPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]);
        const prevDirectSaleDailyPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt", timezone: "America/Phoenix" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]);
        const prevCreditDailyPromise = CreditMemo.aggregate([{ $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt", timezone: "America/Phoenix" } }, refunds: { $sum: "$total" }, memos: { $sum: 1 } } }]);

        // --- 2. PREVIOUS PERIOD TOTALS ---
        const prevPreordersPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $group: { _id: null, rev: { $sum: "$total" }, count: { $sum: 1 } } }]);
        const prevDirectSalesPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } }, { $group: { _id: null, rev: { $sum: "$total" }, count: { $sum: 1 } } }]);
        const prevCreditsPromise = CreditMemo.aggregate([{ $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $group: { _id: null, ref: { $sum: "$total" }, count: { $sum: 1 } } }]);

        // --- 3. SALES BY VENDOR ---
        const poVendorsPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchPreorder } }, { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 }, revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, "$total", 0] } } } }]);
        const dsVendorsPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...driverMatchDirectSale } }, { $group: { _id: "$createdBy", rev: { $sum: "$total" }, count: { $sum: 1 }, revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, "$total", 0] } } } }]);
        const poVendorsPrevPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...driverMatchPreorder } }, { $group: { _id: "$createdBy", rev: { $sum: "$total" } } }]);
        const dsVendorsPrevPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...driverMatchDirectSale } }, { $group: { _id: "$createdBy", rev: { $sum: "$total" } } }]);

        // --- 4. PRODUCT METRICS ---
        const bestSellersPreorderPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { $group: { _id: "$inv.product", qty: { $sum: "$products.deliveredQuantity" }, rev: { $sum: { $multiply: ["$products.deliveredQuantity", { $ifNull: ["$products.actualCost", 0] }] } } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $project: { qty: 1, rev: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const bestSellersDirectPromise = DirectSale.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalDirectSaleMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", qty: { $sum: "$products.quantity" }, rev: { $sum: { $multiply: ["$products.quantity", { $ifNull: ["$products.unitPrice", 0] }] } } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $project: { qty: 1, rev: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);

        const prevBestSellersPOPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $unwind: "$products" }, { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } }, { $unwind: "$inv" }, { $group: { _id: "$inv.product", qty: { $sum: "$products.deliveredQuantity" } } }]);
        const prevBestSellersDSPromise = DirectSale.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalDirectSaleMatch } }, { $unwind: "$products" }, { $group: { _id: "$products.product", qty: { $sum: "$products.quantity" } } }]);
        
        const mostReturnedPromise = CreditMemo.aggregate([
            { $match: { status: "received", returnedAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch } },
            { $unwind: "$products" },
            { $group: { _id: "$products.product", totalReturned: { $sum: "$products.pickedQuantity" }, rev: { $sum: { $multiply: ["$products.pickedQuantity", { $ifNull: ["$products.actualCost", 0] }] } } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalReturned: -1 } },
            { $limit: 50 },
            { $project: { totalReturned: 1, rev: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize" } }
        ]);
        const prevMostReturnedPromise = CreditMemo.aggregate([{ $match: { status: "received", returnedAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch } }, { $unwind: "$products" }, { $group: { _id: "$products.product", totalReturned: { $sum: "$products.pickedQuantity" } } }]);

        const deviationsPromise = PreOrder.aggregate([
            { $match: { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd }, ...globalPreorderMatch, ...warehouseMatch } },
            { $unwind: "$products" },
            { $match: { "products.deviationReason": { $exists: true, $ne: null } } },
            { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } },
            { $unwind: "$inv" },
            { 
                $group: { 
                    _id: { product: "$inv.product", reason: "$products.deviationReason" }, 
                    totalDeviations: { 
                        $sum: { $subtract: [ { $ifNull: ["$products.pickedQuantity", 0] }, { $ifNull: ["$products.deliveredQuantity", 0] } ] } 
                    } 
                } 
            },
            { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $lookup: { from: "brands", localField: "product.brand", foreignField: "_id", as: "brand" } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $sort: { totalDeviations: -1 } },
            { $limit: 50 },
            { $project: { reason: "$_id.reason", totalDeviations: 1, name: "$product.name", sku: "$product.sku", upc: "$product.upc", weight: "$product.weight", unit: "$product.unit", brandName: "$brand.name", caseSize: "$product.caseSize", unitPrice: "$product.unitPrice" } }
        ]);
        const prevDeviationsPromise = PreOrder.aggregate([{ $match: { status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd }, ...globalPreorderMatch, ...warehouseMatch } }, { $unwind: "$products" }, { $match: { "products.deviationReason": { $exists: true, $ne: null } } }, { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inv" } }, { $unwind: "$inv" }, { $group: { _id: { product: "$inv.product", reason: "$products.deviationReason" }, totalDeviations: { $sum: { $subtract: [ { $ifNull: ["$products.pickedQuantity", 0] }, { $ifNull: ["$products.deliveredQuantity", 0] } ] } } } }]);

        // --- 5. ROUTING & WAREHOUSE STATS ---
        const poRoutingPromise = PreOrder.aggregate([{ $match: { ...globalPreorderMatch, $or: [ { status: "ready", deliveryDate: { $gte: todayStart, $lte: todayEnd } }, { status: "ready", deliveryDate: { $gte: currentStart, $lte: currentEnd } }, { status: "delivered", deliveredAt: { $gte: todayStart, $lte: todayEnd } }, { status: "delivered", deliveredAt: { $gte: currentStart, $lte: currentEnd } } ] } }, { $group: { _id: "$routeAssigned", onRoute: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", todayStart] }, { $lte: ["$deliveryDate", todayEnd] }] }, 1, 0] } }, deliveredToday: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } }, deliveredPeriod: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, 1, 0] } }, revenueToday: { $sum: { $cond: [ { $or: [ { $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", todayStart] }, { $lte: ["$deliveryDate", todayEnd] }] }, { $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] } ]}, "$total", 0 ] } }, revenuePeriod: { $sum: { $cond: [ { $or: [ { $and: [{ $eq: ["$status", "ready"] }, { $gte: ["$deliveryDate", currentStart] }, { $lte: ["$deliveryDate", currentEnd] }] }, { $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] } ]}, "$total", 0 ] } } } }]);
        const dsRoutingPromise = DirectSale.aggregate([{ $match: { ...globalDirectSaleMatch, status: "delivered", $or: [ { deliveredAt: { $gte: currentStart, $lte: currentEnd } }, { deliveredAt: { $gte: todayStart, $lte: todayEnd } } ] } }, { $group: { _id: "$route", deliveredToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, 1, 0] } }, deliveredPeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, 1, 0] } }, onRoute: { $sum: 0 }, revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", todayStart] }, { $lte: ["$deliveredAt", todayEnd] }] }, "$total", 0] } }, revenuePeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", currentStart] }, { $lte: ["$deliveredAt", currentEnd] }] }, "$total", 0] } }, } }]);

        const prevDriverRevPO = PreOrder.aggregate([{ $match: { ...globalPreorderMatch, status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: "$routeAssigned", revenuePrev: { $sum: "$total" } } }]);
        const prevDriverRevDS = DirectSale.aggregate([{ $match: { ...globalDirectSaleMatch, status: "delivered", deliveredAt: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: "$route", revenuePrev: { $sum: "$total" } } }]);

        const pendingAssemblyCount = PreOrder.countDocuments({ status: "assigned", ...globalPreorderMatch });
        const warehouseAssembledPromise = PreOrder.aggregate([{ $match: { ...globalPreorderMatch, ...warehouseMatch, $or: [ { assembledAt: { $gte: currentStart, $lte: currentEnd } }, { assembledAt: { $gte: todayStart, $lte: todayEnd } } ] } }, { $group: { _id: "$assembledBy", assembledPeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", currentStart] }, { $lte: ["$assembledAt", currentEnd] }] }, 1, 0] } }, assembledToday: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, 1, 0] } }, revenuePeriod: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", currentStart] }, { $lte: ["$assembledAt", currentEnd] }] }, "$total", 0] } }, revenueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$assembledAt", todayStart] }, { $lte: ["$assembledAt", todayEnd] }] }, "$subtotal", 0] } } } }]);
        const prevWarehouseAssembledPromise = PreOrder.aggregate([{ $match: { ...globalPreorderMatch, ...warehouseMatch, assembledAt: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: "$assembledBy", revenuePrev: { $sum: "$total" } } }]);

        // --- 6. TIMING AGGREGATION BUILDERS ---
        const buildTimePipeline: any = (Model: any, matchQuery: any, timeField: string, groupKey: string) => {
            return Model.aggregate([
                { $match: { ...matchQuery, [timeField]: { $exists: true, $ne: null }, $or: [ { [timeField]: { $gte: currentStart, $lte: currentEnd } }, { [timeField]: { $gte: todayStart, $lte: todayEnd } } ] } },
                { $group: { _id: { key: groupKey, date: { $dateToString: { format: "%Y-%m-%d", date: `$${timeField}`, timezone: "America/Phoenix" } } }, minTime: { $min: `$${timeField}` }, maxTime: { $max: `$${timeField}` }, count: { $sum: 1 }, isToday: { $max: { $cond: [{ $and: [{ $gte: [`$${timeField}`, todayStart] }, { $lte: [`$${timeField}`, todayEnd] }] }, 1, 0] } }, isPeriod: { $max: { $cond: [{ $and: [{ $gte: [`$${timeField}`, currentStart] }, { $lte: [`$${timeField}`, currentEnd] }] }, 1, 0] } } } },
                { $group: { _id: "$_id.key", durationPeriod: { $sum: { $cond: [{ $eq: ["$isPeriod", 1] }, { $subtract: ["$maxTime", "$minTime"] }, 0] } }, gapsPeriod: { $sum: { $cond: [{ $and: [{ $eq: ["$isPeriod", 1] }, { $gt: ["$count", 1] }] }, { $subtract: ["$count", 1] }, 0] } }, durationToday: { $sum: { $cond: [{ $eq: ["$isToday", 1] }, { $subtract: ["$maxTime", "$minTime"] }, 0] } }, gapsToday: { $sum: { $cond: [{ $and: [{ $eq: ["$isToday", 1] }, { $gt: ["$count", 1] }] }, { $subtract: ["$count", 1] }, 0] } } } }
            ]);
        };
        const buildPrevTimePipeline = (Model: any, matchQuery: any, timeField: string, groupKey: string) => {
            return Model.aggregate([
                { $match: { ...matchQuery, [timeField]: { $gte: prevStart, $lte: prevEnd } } },
                { $group: { _id: { key: groupKey, date: { $dateToString: { format: "%Y-%m-%d", date: `$${timeField}`, timezone: "America/Phoenix" } } }, minTime: { $min: `$${timeField}` }, maxTime: { $max: `$${timeField}` }, count: { $sum: 1 } } },
                { $group: { _id: "$_id.key", durationPrev: { $sum: { $subtract: ["$maxTime", "$minTime"] } }, gapsPrev: { $sum: { $cond: [{ $gt: ["$count", 1] }, { $subtract: ["$count", 1] }, 0] } } } }
            ]);
        };

        const vendorTimesPO = buildTimePipeline(PreOrder, globalPreorderMatch, "createdAt", "$createdBy");
        const vendorTimesDS = buildTimePipeline(DirectSale, globalDirectSaleMatch, "createdAt", "$createdBy");
        const prevVendorTimesPO = buildPrevTimePipeline(PreOrder, globalPreorderMatch, "createdAt", "$createdBy");
        const prevVendorTimesDS = buildPrevTimePipeline(DirectSale, globalDirectSaleMatch, "createdAt", "$createdBy");

        const driverTimesPO = buildTimePipeline(PreOrder, { ...globalPreorderMatch, status: "delivered" }, "deliveredAt", "$routeAssigned");
        const driverTimesDS = buildTimePipeline(DirectSale, { ...globalDirectSaleMatch, status: "delivered" }, "deliveredAt", "$route");
        const prevDriverTimesPO = buildPrevTimePipeline(PreOrder, { ...globalPreorderMatch, status: "delivered" }, "deliveredAt", "$routeAssigned");
        const prevDriverTimesDS = buildPrevTimePipeline(DirectSale, { ...globalDirectSaleMatch, status: "delivered" }, "deliveredAt", "$route");

        const warehouseTimesPromise = buildTimePipeline(PreOrder, { ...globalPreorderMatch, ...warehouseMatch }, "assembledAt", "$assembledBy");
        const prevWarehouseTimesPromise = buildPrevTimePipeline(PreOrder, { ...globalPreorderMatch, ...warehouseMatch }, "assembledAt", "$assembledBy");

        // --- EXECUTE ALL ---
        const [
            poDaily, dsDaily, crDaily, prevPoDaily, prevDsDaily, prevCrDaily,
            prevPO, prevDS, prevCR,
            poVendors, dsVendors, poVendorsPrev, dsVendorsPrev,
            bsPO, bsDS, prevBsPO, prevBsDS, mostReturned, prevMostReturned, deviations, prevDeviations,
            poRouting, dsRouting, prPO, prDS,
            pendingAssm, whStatsRaw, pWhStatsRaw, 
            vPO, vDS, pvPO, pvDS, dPO, dDS, pdPO, pdDS, whTimesRaw, pWhTimesRaw
        ] = await Promise.all([
            preorderDailyPromise, directSaleDailyPromise, creditDailyPromise, prevPreorderDailyPromise, prevDirectSaleDailyPromise, prevCreditDailyPromise,
            prevPreordersPromise, prevDirectSalesPromise, prevCreditsPromise,
            poVendorsPromise, dsVendorsPromise, poVendorsPrevPromise, dsVendorsPrevPromise,
            bestSellersPreorderPromise, bestSellersDirectPromise, prevBestSellersPOPromise, prevBestSellersDSPromise, mostReturnedPromise, prevMostReturnedPromise, deviationsPromise, prevDeviationsPromise,
            poRoutingPromise, dsRoutingPromise, prevDriverRevPO, prevDriverRevDS,
            pendingAssemblyCount, warehouseAssembledPromise, prevWarehouseAssembledPromise,
            vendorTimesPO, vendorTimesDS, prevVendorTimesPO, prevVendorTimesDS, driverTimesPO, driverTimesDS, prevDriverTimesPO, prevDriverTimesDS, warehouseTimesPromise, prevWarehouseTimesPromise
        ]);

        // --- MERGE CHART LOGIC ---
        const chartData = [];
        let curD = new Date(currentStart);
        const endD = new Date(currentEnd);
        let pD = new Date(prevStart);

        let currentRevenueTotal = 0; let currentOrdersTotal = 0;
        let currentRefundsTotal = 0; let currentMemosTotal = 0;

        while (curD <= endD) {
            const dateStr = curD.toISOString().split("T")[0];
            const prevDateStr = pD.toISOString().split("T")[0];

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
                date: dateStr, displayDate: dateStr,
                revenue: rev, prevRevenue: prevRevDaily,
                refunds: ref, prevRefunds: prevRefDaily,
                orders: ord, prevOrders: prevOrdDaily,
            });
            curD.setDate(curD.getDate() + 1);
            pD.setDate(pD.getDate() + 1);
        }

        const pRev = (prevPO[0]?.rev || 0) + (prevDS[0]?.rev || 0);
        const pOrd = (prevPO[0]?.count || 0) + (prevDS[0]?.count || 0);
        const pRef = prevCR[0]?.ref || 0;
        const pMem = prevCR[0]?.count || 0;
        const currentAOV = (currentOrdersTotal + currentMemosTotal) > 0 ? (currentRevenueTotal + currentRefundsTotal) / (currentOrdersTotal + currentMemosTotal) : 0;
        const prevAOV = (pOrd + pMem) > 0 ? (pRev + pRef) / (pOrd + pMem) : 0;

        // --- MERGE TIMING HELPER ---
        const applyTimings = (item: any, id: string, currA: any[], currB: any[], prevA: any[], prevB: any[]) => {
            const ca = currA.find(x => x._id?.toString() === id) || {};
            const cb = currB.find(x => x._id?.toString() === id) || {};
            const pa = prevA.find(x => x._id?.toString() === id) || {};
            const pb = prevB.find(x => x._id?.toString() === id) || {};

            const durationToday = (ca.durationToday || 0) + (cb.durationToday || 0);
            const gapsToday = (ca.gapsToday || 0) + (cb.gapsToday || 0);
            const durationPeriod = (ca.durationPeriod || 0) + (cb.durationPeriod || 0);
            const gapsPeriod = (ca.gapsPeriod || 0) + (cb.gapsPeriod || 0);
            const durationPrev = (pa.durationPrev || 0) + (pb.durationPrev || 0);
            const gapsPrev = (pa.gapsPrev || 0) + (pb.gapsPrev || 0);

            return {
                ...item,
                durationTodayMin: durationToday > 0 ? durationToday / 60000 : 0,
                durationPeriodMin: durationPeriod > 0 ? durationPeriod / 60000 : 0,
                durationPrevMin: durationPrev > 0 ? durationPrev / 60000 : 0,
                avgTimeToday: gapsToday > 0 ? (durationToday / 60000) / gapsToday : 0,
                avgTimePeriod: gapsPeriod > 0 ? (durationPeriod / 60000) / gapsPeriod : 0,
                avgTimePrev: gapsPrev > 0 ? (durationPrev / 60000) / gapsPrev : 0,
            };
        };

        // --- VENDORS ---
        const vendorMap = new Map();
        [...poVendors, ...dsVendors].forEach(v => {
            const id = v._id?.toString() || "unknown";
            if (!vendorMap.has(id)) vendorMap.set(id, { _id: id, rev: 0, count: 0, revenueToday: 0, prevRev: 0 });
            vendorMap.get(id).rev += v.rev;
            vendorMap.get(id).count += v.count;
            vendorMap.get(id).revenueToday += (v.revenueToday || 0);
        });
        [...poVendorsPrev, ...dsVendorsPrev].forEach(v => {
            const id = v._id?.toString() || "unknown";
            if (!vendorMap.has(id)) vendorMap.set(id, { _id: id, rev: 0, count: 0, revenueToday: 0, prevRev: 0 });
            vendorMap.get(id).prevRev += v.rev;
        });
        
        const User = mongoose.model("User");
        const RouteModel = mongoose.model("Route");
        let mergedVendors = Array.from(vendorMap.values()).sort((a, b) => b.rev - a.rev);
        const vendorIds = mergedVendors.map(v => v._id).filter(id => id !== "unknown");
        
        const [users, vendorRoutes] = await Promise.all([
            User.find({ _id: { $in: vendorIds } }).select("firstName lastName"),
            RouteModel.find({ user: { $in: vendorIds } }).select("code user")
        ]);

        mergedVendors = mergedVendors.map(v => {
            const user = users.find(u => u._id.toString() === v._id);
            const route = vendorRoutes.find(r => r.user?.toString() === v._id);
            const base = {
                ...v,
                revenuePeriod: v.rev,
                revenuePrev: v.prevRev,
                name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
                routeName: route ? route.code : "001"
            };
            return applyTimings(base, v._id, vPO, vDS, pvPO, pvDS);
        });

        // --- ROUTES/DRIVERS ---
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
            const doc = routeDocs.find(d => d._id.toString() === r._id);
            const pr = (prPO.find(x => x._id?.toString() === r._id)?.revenuePrev || 0) + (prDS.find(x => x._id?.toString() === r._id)?.revenuePrev || 0);
            return applyTimings({ ...r, revenuePrev: pr, routeName: doc ? doc.code : "Unassigned", driverName: doc?.user ? `${(doc.user as any).firstName} ${(doc.user as any).lastName}` : "No Driver" }, r._id, dPO, dDS, pdPO, pdDS);
        });

        // --- WAREHOUSE ---
        const usersToLookup = [...new Set([...whStatsRaw.map(w => w._id?.toString()), ...whTimesRaw.map((w: any) => w._id?.toString())])].filter(Boolean);
        const whUsers = await User.find({ _id: { $in: usersToLookup } }).select("firstName lastName");

        const mergedWarehouse = usersToLookup.map(userId => {
            const user = whUsers.find(u => u._id.toString() === userId);
            const stat = whStatsRaw.find(w => w._id?.toString() === userId) || {};
            const pStat = pWhStatsRaw.find(w => w._id?.toString() === userId) || {};
            const base = { userId, userName: user ? `${user.firstName} ${user.lastName}` : "Unknown", assembledToday: stat.assembledToday || 0, assembledPeriod: stat.assembledPeriod || 0, revenueToday: stat.revenueToday || 0, revenuePeriod: stat.revenuePeriod || 0, revenuePrev: pStat.revenuePrev || 0 };
            return applyTimings(base, userId, whTimesRaw, [], pWhTimesRaw, []);
        });

        // --- PRODUCTS TREND HELPER ---
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
            if (!productMap.has(id)) productMap.set(id, { ...p, qty: 0, rev: 0 });
            productMap.get(id).qty += (p.qty || 0);
            productMap.get(id).rev += (p.rev || 0);
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

        return NextResponse.json({
            metrics: {
                sales: { current: currentRevenueTotal, previous: pRev },
                credits: { current: currentRefundsTotal, previous: pRef },
                aov: { current: currentAOV, previous: prevAOV },
                ordersDelivered: { current: currentOrdersTotal, previous: pOrd },
                chartData
            },
            warehouse: { pendingAssembly: pendingAssm, assembled: mergedWarehouse.reduce((acc, curr) => acc + (curr.assembledToday || 0), 0), byUser: mergedWarehouse },
            today: { totalOnRoute: mergedRoutes.reduce((sum, r) => sum + r.onRoute, 0), totalDeliveredToday: mergedRoutes.reduce((sum, r) => sum + r.deliveredToday, 0), byDriver: mergedRoutes },
            vendors: mergedVendors,
            products: { bestSellers: mergedBestSellers, mostReturned: mergedMostReturned, deviations: mergedDeviations }
        });

    } catch (error: any) {
        console.error("Dashboard Aggregation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}