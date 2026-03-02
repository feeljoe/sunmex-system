import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import { Workbook } from "exceljs";

export async function GET() {
    try{
        await connectToDatabase();
        const preorders = await PreOrder.find({status: "pending"})
        .populate("client")
        .populate("createdBy");

        if(!preorders.length){
            return NextResponse.json({error: "No pending orders found"}, {status: 404});
        }

        const grouped: Record<string, any> = {};
        for (const preorder of preorders){
            const client: any = preorder.client;
            const createdBy: any = preorder.createdBy;
            if(!client?.clientNumber) continue;
            if(!grouped[client.clientNumber]){
                grouped[client.clientNumber] = {
                    clientNumber: client.clientNumber,
                    clientName: client.clientName,
                    billingAddress: client.billingAddress,
                    subtotal: 0,
                    createdById: createdBy?._id?.toString(),
                };
            }
            grouped[client.clientNumber].subtotal += preorder.subtotal || 0;
        }
        const results = Object.values(grouped);

        const userIds = [
            ...new Set(results.map((r: any) => r.createdById).filter(Boolean)),
        ];
        const routes = await Route.find({user: { $in: userIds } })
            .populate("user")
            .lean();

       const routeMap: Record<string, {vendor: string; code: string}> = {};
       for(const route of routes){
        const user: any = route.user;
        if(!user?._id) continue;

        const vendorString = `${route.code || ""} - ${user?.firstName || ""} ${user?.lastName || ""}`.trim();

        routeMap[route.user._id.toString()] = {
            vendor: vendorString,
            code: route.code,
        };
       }
       for(const row of results) {
        const routeInfo = routeMap[row.createdById];
        if(routeInfo){
            row.vendor = routeInfo.vendor;
            row.vendorCode = routeInfo.code;
        }else {
            row.vendor = "";
            row.vendorCode = "";
        }
       }
       results.sort((a: any, b: any) => {
        if(!a.vendorCode) return 1;
        if(!b.vendorCode) return -1;
        return a.vendorCode.localeCompare(b.vendorCode, undefined, {
            numeric: true,
        });
       });

        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet("Preorders For Routes");
        worksheet.columns = [
            { header: "Client Name", key: "clientName", width: 30 },
            { header: "Billing Address", key: "billingAddress", width: 45 },
            { header: "Vendor", key: "vendor", width: 25 },
            { header: "Subtotal", key: "subtotal", width: 12 },   
        ];

        for(const row of results){
            const address = row.billingAddress
            ? `${row.billingAddress.addressLine || ""}, ${row.billingAddress.city || ""}, ${row.billingAddress.state || ""} ${row.billingAddress.zipCode || ""}`
            : "";

            worksheet.addRow({
                clientName: row.clientName,
                billingAddress: address,
                vendor: row.vendor,
                subtotal: Number(row.subtotal.toFixed(2)),
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                "attachment; filename=preorders-for-routes.xlsx",
            },
        });
    }catch(err){
        console.error(err);
        return NextResponse.json(
            { error: "Failed to export preorders"},
            {status: 500}
        );
    }
}