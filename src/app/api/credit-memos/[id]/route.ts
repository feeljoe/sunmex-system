// app/api/credit-memos/[id]/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = await context.params;
    const body = await req.json();

    const { client, products } = body;

    const creditMemo = await CreditMemo.findById(id).session(session);

    if (!creditMemo) {
      throw new Error("Credit memo not found");
    }

    // Prevent editing if already received or cancelled
    if (creditMemo.status !== "pending") {
      throw new Error("Only pending credit memos can be edited");
    }

    // Recalculate totals
    const subtotal = products.reduce(
      (sum: number, p: any) =>
        sum + p.quantity * (p.actualCost ?? 0),
      0
    );

    // Update fields
    creditMemo.client = client;

    creditMemo.products = products.map((p: any) => ({
      product: p.product,
      quantity: p.quantity,
      actualCost: p.actualCost ?? 0,
      returnReason: p.returnReason,
    }));

    creditMemo.subtotal = subtotal;
    creditMemo.total = subtotal;

    await creditMemo.save({ session });

    await session.commitTransaction();

    return NextResponse.json({ success: true });

  } catch (err: any) {
    await session.abortTransaction();
    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;

    const creditMemo = await CreditMemo.findById(id)
    .populate({
      path: "products",
      populate: {
        path: "product",
          populate: {
            path: "brand",
          },
      },
    })
    .populate("client")
    .populate("routeAssigned");

    if(!creditMemo) {
      return NextResponse.json({ error: "Credit Memo Not Found"}, {status: 404});
    }
    return NextResponse.json(creditMemo);
  } catch(err){
    console.error(err);
    return NextResponse.json({ error: "Server error"}, {status: 500});
  }

}