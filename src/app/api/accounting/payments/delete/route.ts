import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { orderId, orderType, paymentIdsToRemove, reason } = body;

        if (!orderId || !orderType || !paymentIdsToRemove || !reason) {
            return NextResponse.json({ error: "Mising required fields"}, { status: 400 });
        }

        const Model = orderType === "directSale" ? DirectSale : PreOrder;

        const document = await Model.findById(orderId);
        if(!document) {
            return NextResponse.json({ error: "Document not found "}, { status: 404 });
        }

        const updatedPayments = document.payments.filter(
            (p:any) => !paymentIdsToRemove.includes(p._id.toString())
        );
        document.payments = updatedPayments;
        document.paymentDeletedReason = reason;
        
        document.paymentStatus = "pending";

        await document.save();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete payment error: ", error);
        return NextResponse.json({error: error.message}, {status: 500});
    }
}