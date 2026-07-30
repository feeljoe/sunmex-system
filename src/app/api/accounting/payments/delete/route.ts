import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { orderId, orderType, paymentIdsToRemove, reason } = body;

        if (!orderId || !orderType || !paymentIdsToRemove || !reason) {
            return NextResponse.json({ error: "Missing required fields"}, { status: 400 });
        }

        const Model = orderType === "directSale" ? DirectSale : PreOrder;

        const document = await Model.findById(orderId);
        if(!document) {
            return NextResponse.json({ error: "Document not found "}, { status: 404 });
        }

        // 1. Identify which payments are actually being removed
        const paymentsToRemove = document.payments.filter(
            (p:any) => paymentIdsToRemove.includes(p._id.toString())
        );
        
        // Did we delete a credit memo?
        const hasCreditMemoDeleted = paymentsToRemove.some(
            (p:any) => p.type === "creditMemo" || p.type === "CreditMemo"
        );

        // 2. Filter them out of the document
        const updatedPayments = document.payments.filter(
            (p:any) => !paymentIdsToRemove.includes(p._id.toString())
        );
        document.payments = updatedPayments;
        document.paymentDeletedReason = reason;
        
        // 3. Recalculate if it's still paid or pending
        const paidSoFar = updatedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        document.paymentStatus = paidSoFar >= (document.total - 0.01) ? "paid" : "pending";

        await document.save();

        // 4. UNLOCK CREDIT MEMOS IF NEEDED
        if (hasCreditMemoDeleted) {
            await CreditMemo.updateMany(
                { $or: [{ preorder: orderId }, { directSale: orderId }] },
                { $set: { paymentProcessed: false } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete payment error: ", error);
        return NextResponse.json({error: error.message}, {status: 500});
    }
}