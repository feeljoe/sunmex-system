import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import Client from "@/models/Client";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { DateTime } from "luxon";

export async function GET(req: Request) {
    try{
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const phoenixNow = DateTime.now();
        phoenixNow.setZone("America/Phoenix");

        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const vendorId = searchParams.get("vendorId");
        const driverId = searchParams.get("driverId");
        const type = searchParams.get("type");

        if(type === "creditMemo"){
            return new NextResponse("Export for Credit Memos Alone is not supported in this format", {status: 400});
        }
        const query: any = {};

        if(fromDate || toDate){
            query.deliveredAt = {};
            if(fromDate) {
                const startOfDay = DateTime.fromISO(fromDate, {zone: "America/Phoenix"})
                    .startOf("day")
                    .toUTC()
                    .toJSDate();
                query.deliveredAt.$gte = startOfDay;
            }
            if(toDate) {
                const endOfDay = DateTime.fromISO(toDate, {zone: "America/Phoenix"})
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
            query.deliveredAt = {$gte: todayStart, $lte: todayEnd};
        }
        if(vendorId){
            query.createdBy = {vendorId};
        }
        if(driverId) {
            const assignedRoutes = await Route.find({
                $or: [{ user: driverId}, {activeDriver: driverId }]
            }).select("_id").lean();

            const routeIds = assignedRoutes.map(r => r._id);
            query.routeAssigned = { $in: routeIds};
        }

        const preorders = await PreOrder.find(query)
            .populate({ path: "client", select: "clientName", model: Client })
            .populate({ path: "createdBy", select: "firstName lastName", model: User})
            .populate({
                path: "routeAssigned",
                model: Route,
                populate: { path: "user", select: "firstName lastName", model: User }
            })
            .lean();
        const preorderIds = preorders.map(p => p._id);
        const creditMemos = await CreditMemo.find({
            preorder: {$in: preorderIds},
            status: "received"
        }).lean();

        const cmMap = creditMemos.reduce((acc, cm) => {
            acc[cm.preorder.toString()] = cm.total;
            return acc;
        }, {} as Record<string, number>);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Bank Deposits");

        worksheet.columns = [
            {header: "Invoice", key: "number", width: 15},
            { header: "Client", key: "clientName", width: 30 },
            { header: "Vendor Name", key: "vendorName", width: 25 },
            { header: "Driver Name", key: "driverName", width: 25 },
            { header: "Delivered At", key: "deliveredAt", width: 15 },
            { header: "Pending", key: "pending", width: 15 },
            { header: "Cash", key: "cash", width: 15 },
            { header: "Check", key: "check", width: 15 },
            { header: "Total Paid (Cash + Check)", key: "totalPaid", width: 20 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = {horizontal: "center"};

        let sumPending = 0;
        let sumCash = 0;
        let sumCheck = 0;
        let sumTotalPaid = 0;

        preorders.forEach((p: any) => {
            const originalTotal = p.total || 0;
            const creditMemoDeduction = cmMap[p._id?.toString()] || 0;
            const finalAdjustedTotal = originalTotal - creditMemoDeduction;

            let pending = 0;
            let cash = 0;
            let check = 0;

            if(!p.payments || p.payments.length === 0){
                pending = finalAdjustedTotal;
            }else {
                p.payments.forEach((payment: any) => {
                    if(payment.type === "cash") cash += (payment.amount || 0);
                    if(payment.type === "check") check += (payment.amount || 0);
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
            
            worksheet.addRow({
                number: p.number || "N/A",
                clientName: p.client?.clientName || "Unknown Client",
                vendorName,
                driverName,
                deliveredAt: deliveredDate,
                pending: pending > 0 ? pending : 0,
                cash,
                check,
                totalPaid,
            });
        });

        worksheet.addRow({});

        const totalsRow = worksheet.addRow({
            number: "",
            clientName: "",
            vendorName: "",
            driverName: "",
            deliveredAt: "OVERALL TOTALS:",
            pending: sumPending,
            cash: sumCash,
            check: sumCheck,
            totalPaid: sumTotalPaid,
        });

        totalsRow.font = { bold: true };
        totalsRow.eachCell((cell) => {
            cell.border = {top: {style: "thin"}};
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="general-report.xlsx"`,
            },
        });
    }catch(error){
        console.error("Export Error: ", error);
        return new NextResponse("Internal Server Error", { status: 500});
    }
}