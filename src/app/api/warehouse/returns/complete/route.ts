import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {

const session = await mongoose.startSession();

session.startTransaction();

try {

    await connectToDatabase();

    const body = await req.json();

    const {
        creditMemoIds,
        products,
        warehouseUser,
        driverSignature,
        warehouseSignature,
    } = body;

    for (const p of products) {
        if (p.returnReason === "good return") {
            await ProductInventory.updateOne(
                { product: p.product },
                {
                    $inc: {
                        onRouteInventory: -p.pickedQuantity,
                        currentInventory: p.pickedQuantity,
                    },
                },
                { session }
            );
        }
        if (p.returnReason === "credit memo") {
            await ProductInventory.updateOne(
                { product: p.product },
                {
                    $inc: {
                        inactiveInventory: -p.pickedQuantity,
                    },
                },
                { session }
            );
        }
    }

    await CreditMemo.updateMany(
        { _id: { $in: creditMemoIds } },
        {
            warehouseStatus: "completed",
            receivedBy: warehouseUser,
            driverSignature,
            warehouseSignature,
            warehouseReceivedAt: new Date(),
        },
        { session }
    );
        await session.commitTransaction();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        await session.abortTransaction();
        console.error("Warehouse receive error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    } finally {
        session.endSession();
    }
}