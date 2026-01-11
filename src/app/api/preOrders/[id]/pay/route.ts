import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  await connectToDatabase();
  const { id } = await context.params;

  try {
    const { paymentMethod, checkNumber } = await req.json();

    if (!paymentMethod) {
      throw new Error("Payment method required");
    }

    const preorder = await PreOrder.findById(id);
    if (!preorder) throw new Error("Preorder not found");

    if (preorder.status !== "delivered") {
      throw new Error("Preorder not delivered");
    }

    preorder.paymentMethod = paymentMethod;
    preorder.checkNumber =
      paymentMethod === "check" ? checkNumber : null;
    preorder.paymentStatus = "paid";

    await preorder.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}
