import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
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

    try{
        const preorder = await PreOrder.findById(id).session(session);
        const body = await req.json();
        const payload: any = {
            reason : body.reason,
        }
        if(!preorder){
            throw new Error("Preorder not found");
        }

        if(["cancelled"].includes(preorder.status) || ["paid"].includes(preorder.paymentStatus)){
            throw new Error("Preorder cannot be cancelled");
        }

        for(const item of preorder.products){
            const inventory = await ProductInventory.findById(item.productInventory).session(session);
            if (!inventory) continue;

            const currentInv = Number(inventory.currentInventory) || 0;
            const preSavedInv = Number(inventory.preSavedInventory) || 0;
            const onRouteInv = Number(inventory.onRouteInventory) || 0;

            let qty = Number(item.quantity) || 0;

            if(preorder.status === "pending" || preorder.status === "assigned") {
                inventory.preSavedInventory =
                    Math.max(0, preSavedInv - qty);
                    inventory.currentInventory = currentInv + qty;
            }
            if(preorder.status === "ready"){
                qty = Number(item.pickedQuantity) || 0;
                inventory.onRouteInventory =
                Math.max(0, onRouteInv - qty);
                inventory.currentInventory = currentInv + qty;
            }
            if(preorder.status === "delivered") {
                qty = Number(item.deliveredQuantity) || 0;
                inventory.currentInventory = currentInv + qty;
            }
            await inventory.save({session});
        }
        preorder.status = "cancelled";
        preorder.cancelledAt = new Date();
        preorder.cancelledBy = user?.user?.id;
        preorder.cancelReason = payload.reason;
        preorder.updatedBy = user?.user.id;
        preorder.updatedAt = new Date();
        await preorder.save({ session });
        await session.commitTransaction();
        return NextResponse.json(preorder);
    }catch(err: any){
        await session.abortTransaction();
        return NextResponse.json(
            {error: err.message},
            {status: 400}
        );
    }finally{
        session.endSession();
    }
}