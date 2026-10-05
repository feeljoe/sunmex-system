import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";

export async function PATCH(req: Request) {
    const user = await getServerSession(authOptions);
    if (!user?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await mongoose.startSession();

    try {
        await connectToDatabase();

        const body = await req.json();
        const {creditMemoIds, returnedQuantities} = body;
        if (!Array.isArray(creditMemoIds) ||
            creditMemoIds.length === 0 ||
            !returnedQuantities ||
            typeof returnedQuantities !== "object") {
                return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
        }
        if (creditMemoIds.some((id: unknown) => typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id))) {
            return NextResponse.json({ error: "Invalid credit memo ID" }, { status: 400 });
        }
        const uniqueIds = [...new Set(creditMemoIds)];
        if (uniqueIds.length !== creditMemoIds.length) {
            return NextResponse.json( {error: "Duplicate credit memo IDs are not allowed" }, { status: 400 });
        }

        await session.withTransaction(async () => {
            const memos = await CreditMemo.find({
                _id: {$in: uniqueIds},
            }).session(session);
            if (memos.length !== uniqueIds.length) {
                throw new Error (`One or more Credit Memos were not found`);
            }
            for (const memo of memos) {
                if (memo.status !== "pending") {
                    throw new Error (`Credit memo ${memo.number} is no longer pending`);
                }
                const quantities = returnedQuantities[memo._id.toString()];
                if (!Array.isArray(quantities) ||
                    quantities.length !== memo.products.length) {
                        throw new Error (`Invalid returned quantities for ${memo.number}`);
                }
                let calculatedTotal = 0;

                memo.products.forEach((product: any, index: number) => {
                    const quantity = quantities[index];
                    if (typeof quantity !== "number" ||
                        !Number.isFinite(quantity) ||
                        quantity < 0 ||
                        quantity > product.quantity
                    ) {
                        throw new Error (`Invalid returned quantity for ${memo.number}`);
                    }
                    product.pickedQuantity = quantity;
                    product.returnedQuantity = quantity;

                    const itemCost = product.actualCost || 0;
                    calculatedTotal += (quantity * itemCost);
                });
                memo.total = Number(calculatedTotal.toFixed(2));
                memo.status = "received";
                memo.returnedAt = new Date();
                memo.returnedBy = user.user.id;
                memo.returnSignature = [
                    user.user.name
                ]
                .filter(Boolean)
                .join(" ")
                .trim();

                memo.warehouseStatus = "completed";
                memo.updatedBy = user.user.id;
                memo.updatedAt = new Date();
                await memo.save({session});
            }
        });
        return NextResponse.json({ success: true, message: "Credit Memos closed successfully", closedCount: uniqueIds.length,});
    } catch (error: any) {
        console.error("Bulk close credit memos error: ", error);
        return NextResponse.json({ error: error.message || "Unable to close credit memos"}, {status: 400});
    } finally {
        await session.endSession();
    }
}