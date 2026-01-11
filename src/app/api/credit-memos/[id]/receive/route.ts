import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { id } = await context.params
  try {
    await connectToDatabase();
    const body = await req.json();

    const creditMemo = await CreditMemo.findById(id).session(session);
    if (!creditMemo) {
        await session.abortTransaction();
      return NextResponse.json({ error: "Credit memo not found" }, { status: 404 });
    }

    let calculateTotal = 0;

    for(const incoming of body.products) {
        const productLine = creditMemo.products.find((p: any) =>
            p.product.equals(incoming.product)
        );

        if(!productLine) continue;

        productLine.pickedQuantity = incoming.pickedQuantity;
        productLine.returnedQuantity = incoming.returnedQuantity;

        const price = productLine.effectiveUnitPrice ?? productLine.unitPrice ?? productLine.actualCost ?? 0;
        calculateTotal += incoming.pickedQuantity * price;

        //Update inventory
        await ProductInventory.updateOne(
            {product: incoming.product },
            { $inc: { onRouteInventory: incoming.pickedQuantity } },
            { session }
        );
    }

    creditMemo.total = calculateTotal;
    creditMemo.signature = body.signature;
    creditMemo.returnedAt = new Date();
    creditMemo.status = "received";

    await creditMemo.save({ session });
    await session.commitTransaction();

    return NextResponse.json(creditMemo, { status: 200 });
  } catch (err: any) {
    session.abortTransaction();
    console.error("Receive credit memo error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }finally {
    session.endSession();
  }
}
