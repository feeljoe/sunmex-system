import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import CreditMemo from "@/models/CreditMemo";
import { DateTime } from "luxon";

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const user = await authenticateMobile(req);

        if(user.userRole !=="vendor") {
            return NextResponse.json({error: "Forbidden - Vendors Only"}, {status: 403});
        }

        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const phoenixNow = DateTime.now().setZone("America/Phoenix");

        const currentStart = fromParam
            ? DateTime.fromISO(fromParam, { zone: "America/Phoenix"}).startOf("day")
            : phoenixNow.startOf("day");

        const currentEnd = toParam
            ? DateTime.fromISO(toParam, { zone: "America/Phoenix"}).endOf("day")
            : phoenixNow.endOf("day");

        const diffInMilliseconds = currentEnd.diff(currentStart).toMillis();
        const previousStart = currentStart.minus({ milliseconds: diffInMilliseconds });
        const previousEnd = currentEnd.minus({ milliseconds: diffInMilliseconds });

        const getMetricsForPeriod = async (start: DateTime, end: DateTime) => {
            const startJS = start.toUTC().toJSDate();
            const endJS = end.toUTC().toJSDate();

            const match = 
            { createdBy: user._id, 
                $or: [ 
                    { 
                        status: "delivered", 
                        deliveredAt: { $gte: startJS, $lte: endJS },
                    },
                    { 
                        status: "received", 
                        returnedAt: { $gte: startJS, $lte: endJS },
                    },
                ],
            };
            const [preorders, directSales, creditMemos] = await Promise.all([
                PreOrder.find(match)
                .populate({ path: "products.productInventory", populate: { path: "product", populate: { path: "productType" } } })
                .lean(),
                DirectSale.find(match)
                .populate({ path: "products.product", populate: { path: "productType" } })
                .lean(),
                CreditMemo.find(match)
                .populate({ path: "products.product", populate: { path: "productType" } })
                .lean()
            ]);

            let ordersPlaced = preorders.length + directSales.length;
            let pending = 0;
            let delivered = 0;
            let subtotal = 0;
            let total = 0;
            let cmCount = creditMemos.length;
            let cmTotal = 0;

            let categorySales: Record<string, number> = {};

            preorders.forEach((po: any) => {
                if (po.status !== "delivered" && po.status !== "cancelled") pending++;
                if (po.status === "delivered") delivered++;
                subtotal += (po.subtotal || 0);
                total += (po.total || 0);

                po.products.forEach((p: any) => {
                    const typeName = p.productInventory?.product?.productType?.name || "Uncategorized";
                    const lineTotal = (p.deliveredQuantity || 0) * (p.actualCost || 0);
                    categorySales[typeName] = (categorySales[typeName] || 0) + lineTotal;
                });
            });

            directSales.forEach((ds: any) => {
                if (ds.status === "pending") pending++;
                if (ds.status === "delivered") delivered++;
                subtotal += (ds.total || 0);
                total += (ds.total || 0);

                ds.products.forEach((p:any) => {
                    const typeName = p.product?.productType?.name || "Uncategorized";
                    const lineTotal = (p.quantity || 0) * (p.unitPrice || 0);
                    categorySales[typeName] = (categorySales[typeName] || 0) + lineTotal;
                });
            });

            creditMemos.forEach((cm: any) => {
                if (cm.status === "pending") {
                    cmTotal += (cm.subtotal || 0);
                } else {
                    cmTotal += (cm.total || 0);
                }
            });

            return {
                ordersPlaced,
                pending,
                delivered,
                subtotal,
                total,
                cmCount,
                cmTotal,
                categorySales,
                items: { preorders, directSales, creditMemos }
            };
        };

        const [currentMetrics, previousMetrics] = await Promise.all([
            getMetricsForPeriod(currentStart, currentEnd),
            getMetricsForPeriod(previousStart, previousEnd)
        ]);

        const formattedList = [
            ...currentMetrics.items.preorders.map((po: any) => ({ ...po, type: "preorder" })),
            ...currentMetrics.items.directSales.map((ds: any) => ({ ...ds, type: "directSale" })),
            ...currentMetrics.items.creditMemos.map((cm: any) => ({ ...cm, type: "creditMemo"}))
        ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return NextResponse.json({
            summary: {
                current: currentMetrics,
                previous: previousMetrics,
            },
            items: formattedList
        });
    } catch (error: any) {
        console.error("MOBILE SALES BATCH ERROR: ", error);
        return NextResponse.json({ error: error.message || "Internal Server Error"}, {status: 500 });
    }
}