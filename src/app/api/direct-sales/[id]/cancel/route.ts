import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import Route from "@/models/Route";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }>}
) {
    await connectToDatabase();
    const { id } = await context.params;
    const session = await mongoose.startSession();
    session.startTransaction();
    const user = await getServerSession(authOptions);

    try {
        const directSale = await DirectSale.findById(id).session(session);
        const body = await req.json();
        
        if (!directSale) {
            throw new Error("Direct Sale not found"); // Fixed wording
        }

        if (["cancelled"].includes(directSale.status) || ["paid"].includes(directSale.paymentStatus)) {
            throw new Error("Direct Sale cannot be cancelled"); // Fixed wording
        }
        
        // Populate isn't strictly needed here since we just need the inventory, but leaving it is fine.
        const route = await Route.findById(directSale.route).session(session);
        
        if (!route) {
            throw new Error("Route not found");
        }

        // --- INVENTORY LOGIC ---
        // Only return inventory if it was pending or delivered
        if (directSale.status === "pending" || directSale.status === "delivered") {
            for (const item of directSale.products) {
                let qty = Number(item.quantity) || 0;
                let productFoundInArray = false;

                // 1. Try to find the item in the route's current inventory
                for (const p of route.inventory) {
                    if (p.product.toString() === item.product.toString()) { // Safe comparison
                        p.quantity += qty; // Return the quantity
                        productFoundInArray = true;
                        break; // Stop looking for this product, move to the next item
                    }
                }

                // 2. If it wasn't found (array was empty or item was removed), push it back in
                if (!productFoundInArray) {
                    route.inventory.push({
                        product: item.product,
                        quantity: qty
                    });
                }
            }
            // 3. Save the route ONCE after all loop calculations are done
            await route.save({ session });
        }

        // --- DIRECT SALE UPDATE ---
        directSale.status = "cancelled";
        directSale.cancelledAt = new Date();
        directSale.cancelledBy = user?.user?.id;
        directSale.cancelReason = body.reason;
        directSale.updatedBy = user?.user?.id;
        directSale.updatedAt = new Date();
        
        await directSale.save({ session });
        
        await session.commitTransaction();
        return NextResponse.json(directSale);
        
    } catch (err: any) {
        await session.abortTransaction();
        return NextResponse.json(
            { error: err.message },
            { status: 400 }
        );
    } finally {
        session.endSession();
    }
}