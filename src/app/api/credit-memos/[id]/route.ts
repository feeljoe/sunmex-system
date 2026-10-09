// app/api/credit-memos/[id]/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getServerSession(authOptions);
  if(!user?.user.id) {
    return NextResponse.json(
      {error: "Unauthorized" },
      { status: 401}
    );
  }
  
  await connectToDatabase();

  const session = await mongoose.startSession();
  
  const isAdmin = user?.user.role === "admin";
  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid credit memo ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const { client, products, location } = body;
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "At least one product is required" },
        { status: 400 }
      );
    }
    const result = await session.withTransaction(async () => {
      const creditMemo = await CreditMemo.findById(id).session(session);

      if (!creditMemo) {
        throw new Error("Credit memo not found");
      }
      // Prevent editing if already received or cancelled
    if (creditMemo.status !== "pending" && !isAdmin) {
      throw new Error("Only pending credit memos can be edited");
    }
    if(creditMemo.warehouseStatus !== "pending"){
      throw new Error("Warehouse already received this credit memo, it can no longer be edited");
    }

    const existingLines = creditMemo.products;
    const updatedProducts = products.map((p: any) => {
      if(!p.product || !mongoose.Types.ObjectId.isValid(p.product)) {
        throw new Error("Invalid product ID");
      }
      const quantity = Number(p.quantity);
      const actualCost = Number(p.actualCost);
      if(!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new Error("Product quantity must be positive");
      }
      if(!Number.isFinite(actualCost) || actualCost < 0) {
        throw new Error("Invalid product price");
      }
      const existingLine = p.creditMemoLineId ? existingLines.find((line: any) => line._id.toString() === p.creditMemoLineId.toString()) : undefined;
      const pickedQuantity = isAdmin && p.pickedQuantity !== undefined ? Number(p.pickedQuantity) : Number(existingLine?.pickedQuantity ?? 0);
      const returnedQuantity = isAdmin && p.returnedQuantity !== undefined ? Number(p.returnedQuantity) : Number(existingLine?.returnedQuantity ?? 0);
      if(!Number.isSafeInteger(pickedQuantity) || !Number.isSafeInteger(returnedQuantity) || pickedQuantity < 0  || returnedQuantity < 0) {
        throw new Error("Picked and returned quantities must be non-negative numbers");
      }
      if(pickedQuantity > quantity) {
        throw new Error("Picked quantity cannot exceed original quantity");
      }
      if(returnedQuantity > pickedQuantity) {
        throw new Error("Returned quantity cannot exceed picked quantity");
      }
      return {
        ...(existingLine && {_id: existingLine._id }),
        product: p.product,
        quantity,
        actualCost,
        pickedQuantity,
        returnedQuantity,
        returnReason: p.returnReason ?? existingLine?.returnReason,
        condition: p.condition ?? existingLine?.condition,
        expirationDate: p.expirationDate ? new Date(p.expirationDate) : existingLine?.expirationDate ?? undefined,
      };
    });
    let total = 0;
    const subtotal = updatedProducts.reduce((sum: number, p:any) => sum + (p.quantity * p.actualCost), 0);
    if(creditMemo.status === "received") {
      total = updatedProducts.reduce((sum: number, p: any) => sum + (p.pickedQuantity * p.actualCost), 0);
    }
    creditMemo.client = client;
    creditMemo.products = updatedProducts;
    if(location) creditMemo.location = location;
    creditMemo.subtotal = subtotal;
    if(creditMemo.status === "received") creditMemo.total = total;
    creditMemo.updatedBy = user.user.id;
    creditMemo.updatedAt = new Date();
    await creditMemo.save({session});
    return {
      success: true,
      creditMemoId: creditMemo._id,
      subtotal,
      total: creditMemo.total,
    };
    });

    return NextResponse.json(result);

  } catch (err: any) {
    await session.abortTransaction();
    console.error("Credit memo update error: ", err);

    return NextResponse.json(
      { error: err.message || "Could not update credit memo"},
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
      .populate({
        path: "client",
        populate: {
          path: "paymentTerm",
        },
      })
      .populate("routeAssigned")
      .populate("createdBy")
      .populate("cancelledBy");

    if (!creditMemo) {
      return NextResponse.json({ error: "Credit Memo Not Found" }, { status: 404 });
    }
    return NextResponse.json(creditMemo);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

}