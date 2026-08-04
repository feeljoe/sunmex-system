import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import PayrollAdjustment from "@/models/PayrollAdjustment";
import RouteAudit from "@/models/RouteAudit";

export async function POST(req: Request, context: { params: Promise<{ id: string }>}){
    try {
        await connectToDatabase();
        const routeId = await context.params;
        const body = await req.json();
        const { updatedInventory, deductions, adminId, routeUserId } = body;

        // 1. Update the Route's local inventory array
        const cleanInventory = updatedInventory.map((item: any) => ({
                product: item.productId,
                quantity: item.actualQty
            }));

        await Route.findByIdAndUpdate(routeId.id, {
            $set: {inventory: cleanInventory}
        });

        // 2. Filter ONLY items marked as "returned" for the Warehouse RouteAudit
        const auditProducts = updatedInventory
            .filter((item: any) => item.adjusted && item.reason === "returned")
            .map((item: any) => ({
                product: item.productId,
                expectedQuantity: item.expectedQty,
                actualQuantity: item.actualQty,
                difference: item.expectedQty - item.actualQty,
                reason: item.reason
            }));

        // 3. Create the RouteAudit document for the warehouse to receive
        if (auditProducts.length > 0) {
            await RouteAudit.create({
                routeAssigned: routeId.id,
                createdBy: adminId,
                status: "pending",
                products: auditProducts
            });
        }

        // 4. Handle Payroll Deductions for missing/damaged items
        if (deductions && deductions.length > 0 && routeUserId) {
            let totalAmount = 0;
            const reasonCounts = { missing: 0, damaged: 0, expired: 0, returned: 0 };

            deductions.forEach((item: any) => {
                const qtyDiff = item.expectedQty - item.actualQty;
                const lineDeduction = qtyDiff * item.unitCost;

                totalAmount += lineDeduction;
                if (item.reason === "missing") reasonCounts.missing += qtyDiff;
                if (item.reason === "damaged") reasonCounts.damaged += qtyDiff;
                if (item.reason === "expired") reasonCounts.expired += qtyDiff;
                if (item.reason === "returned") reasonCounts.returned += qtyDiff;
            });

            const reasonParts = [];
            if (reasonCounts.missing > 0) reasonParts.push(`${reasonCounts.missing} missing products`);
            if (reasonCounts.damaged > 0) reasonParts.push(`${reasonCounts.damaged} damaged products`);
            if (reasonCounts.expired > 0) reasonParts.push(`${reasonCounts.expired} expired products`);
            if (reasonCounts.returned > 0) reasonParts.push(`${reasonCounts.returned} unreturned products`);
            
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}