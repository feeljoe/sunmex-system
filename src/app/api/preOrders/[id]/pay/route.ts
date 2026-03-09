import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import { NextResponse } from "next/server";

const toCents = (value: number) => Math.round(value * 100);
export async function PATCH(
  req: Request,
  context: { params: { id: string }}
) {
  await connectToDatabase();
  const { id } = context.params;

  try {
    const { payments } = await req.json();
    console.log("PATCH /preOrder/:id/pay: ", {id, payments});
    
    if (!payments || !Array.isArray(payments)) {
      throw new Error("Payments Array Required");
    }

    const preorder = await PreOrder.findById(id);
    if (!preorder) throw new Error("Preorder not found");

    if (preorder.status !== "delivered") {
      throw new Error("Preorder not delivered");
    }

    preorder.payments = payments;
    preorder.paymentStatus = "paid";

    await preorder.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}
