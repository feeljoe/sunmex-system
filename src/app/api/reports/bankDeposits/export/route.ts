import { NextResponse } from "next/server";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import Client from "@/models/Client";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { DateTime } from "luxon";

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const phoenixNow = DateTime.now();
        phoenixNow.setZone("America/Phoenix");

        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const vendorId = searchParams.get("vendorId");
        const driverId = searchParams.get("driverId");
        const type = searchParams.get("type");

        if (type === "creditMemo") {
            return new NextResponse("Export for Credit Memos Alone is not supported in this format", { status: 400 });
        }
        
        const query: any = {};

        if (fromDate || toDate) {
            query.deliveredAt = {};
            if (fromDate) {
                const startOfDay = DateTime.fromISO(fromDate, { zone: "America/Phoenix" })
                    .startOf("day")
                    .toUTC()
                    .toJSDate();
                query.deliveredAt.$gte = startOfDay;
            }
            if (toDate) {
                const endOfDay = DateTime.fromISO(toDate, { zone: "America/Phoenix" })
                    .endOf("day")
                    .toUTC()
                    .toJSDate();
                query.deliveredAt.$lte = endOfDay;
            }
        } else {
            const todayStart = phoenixNow
                .startOf("day")
                .toUTC()
                .toJSDate();
            const todayEnd = phoenixNow
                .endOf("day")
                .toUTC()
                .toJSDate();
            query.deliveredAt = { $gte: todayStart, $lte: todayEnd };
        }
        
        // FIXED: This was {vendorId} which creates an invalid query object
        if (vendorId) {
            query.createdBy = vendorId;
        }
        
        if (driverId) {
            const assignedRoutes = await Route.find({
                $or: [{ user: driverId }, { activeDriver: driverId }]
            }).select("_id").lean();

            const routeIds = assignedRoutes.map(r => r._id);
            query.routeAssigned = { $in: routeIds };
        }

        const preorders = await PreOrder.find(query)
            .populate({ path: "client", select: "clientName", model: Client })
            .populate({ path: "createdBy", select: "firstName lastName", model: User })
            .populate({
                path: "routeAssigned",
                model: Route,
                populate: { path: "user", select: "firstName lastName", model: User }
            })
            .lean();
            
        const preorderIds = preorders.map(p => p._id);
        const creditMemos = await CreditMemo.find({
            preorder: { $in: preorderIds },
            status: "received"
        }).lean();

        const cmMap = creditMemos.reduce((acc, cm) => {
            acc[cm.preorder.toString()] = cm.total;
            return acc;
        }, {} as Record<string, number>);

        // ==========================================
        // BUILD CSV INSTEAD OF EXCEL
        // ==========================================
        
        if (preorders.length === 0) {
            return new NextResponse("No data found to export.", { status: 404 });
        }

        const headers = [
            "Invoice",
            "Client",
            "Vendor Name",
            "Driver Name",
            "Delivered At",
            "Pending",
            "Cash",
            "Check",
            "Total Paid (Cash + Check)"
        ];

        const csvRows = [];
        // Add headers row
        csvRows.push(headers.map(h => `"${h}"`).join(","));

        let sumPending = 0;
        let sumCash = 0;
        let sumCheck = 0;
        let sumTotalPaid = 0;

        // Helper to escape text for CSV
        const escapeCSV = (str: any) => `"${String(str ?? "").replace(/"/g, '""')}"`;

        preorders.forEach((p: any) => {
            const originalTotal = p.total || 0;
            const creditMemoDeduction = cmMap[p._id?.toString()] || 0;
            const finalAdjustedTotal = originalTotal - creditMemoDeduction;

            let pending = 0;
            let cash = 0;
            let check = 0;

            if (!p.payments || p.payments.length === 0) {
                pending = finalAdjustedTotal;
            } else {
                p.payments.forEach((payment: any) => {
                    if (payment.type === "cash") cash += (payment.amount || 0);
                    if (payment.type === "check") check += (payment.amount || 0);
                });

                pending = finalAdjustedTotal - (cash + check);
            }
            pending = pending > 0 ? pending : 0;
            const totalPaid = cash + check;

            sumPending += pending;
            sumCash += cash;
            sumCheck += check;
            sumTotalPaid += totalPaid;

            const vendorName = p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : "N/A";
            const driverName = p.routeAssigned?.user ? `${p.routeAssigned.user.firstName} ${p.routeAssigned.user.lastName}` : "Unassigned";

            const deliveredDate = p.deliveredAt
                ? new Date(p.deliveredAt).toLocaleDateString("en-US")
                : "";

            // Add data row
            csvRows.push([
                escapeCSV(p.number || "N/A"),
                escapeCSV(p.client?.clientName || "Unknown Client"),
                escapeCSV(vendorName),
                escapeCSV(driverName),
                escapeCSV(deliveredDate),
                pending, // Numbers don't need quotes
                cash,
                check,
                totalPaid
            ].join(","));
        });

        // Add blank row
        csvRows.push(",,,,,,,,");

        // Add totals row
        csvRows.push([
            '""',
            '""',
            '""',
            '""',
            '"OVERALL TOTALS:"',
            sumPending,
            sumCash,
            sumCheck,
            sumTotalPaid
        ].join(","));

        // Join everything with line breaks
        const csvString = csvRows.join("\n");

        return new NextResponse(csvString, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="bank-deposits-report.csv"`,
            },
        });
    } catch (error) {
        console.error("Export Error: ", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}