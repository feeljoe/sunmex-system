import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import PayrollAdjustment from "@/models/PayrollAdjustment";
import mongoose from "mongoose";

export async function POST(req: Request, context: { params: Promise<{ id: string }>}){
    try {
        await connectToDatabase();
        const routeId = await context.params;
        const body = await req.json();
        const { updatedInventory, deductions, adminId, routeUserId } = body;

        const cleanInventory = updatedInventory.map((item: any) => ({
                product: item.productId,
                quantity: item.actualQty
            }));

        await Route.findByIdAndUpdate(routeId.id, {
            $set: {inventory: cleanInventory}
        });

        if (deductions && deductions.length > 0 && routeUserId) {
            let totalAmount = 0;
            const reasonCounts = { missing: 0, damaged: 0, expired: 0};

            deductions.forEach((item: any) => {
                const qtyDiff = item.expectedQty - item.actualQty;
                const lineDeduction = qtyDiff * item.unitCost;

                totalAmount += lineDeduction;
                if (item.reason === "missing") reasonCounts.missing += qtyDiff;
                if (item.reason === "damaged") reasonCounts.damaged += qtyDiff;
                if (item.reason === "expired") reasonCounts.expired += qtyDiff;
            });

            const reasonParts = [];
            if (reasonCounts.missing > 0) reasonParts.push(`${reasonCounts.missing} missing products`);
            if (reasonCounts.damaged > 0) reasonParts.push(`${reasonCounts.damaged} damaged products`);
            if (reasonCounts.expired > 0) reasonParts.push(`${reasonCounts.expired} expired products`);
            
            const combinedReason = reasonParts.join(" and ");

            await PayrollAdjustment.create({
                user: routeUserId,
                type: "deduction",
                amount: totalAmount,
                reason: combinedReason,
                date: new Date(),
                processed: false,
                createdBy: adminId,
            });
        }
        return NextResponse.json({ message: "Audit complete" }, { status: 200 });
    } catch (error: any) {
        console.error("Audit Error: ", error);
        return NextResponse.json({ error: error.messsage }, { status: 500 });
    }
}