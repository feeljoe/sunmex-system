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
    const { payments } = await req.json();

    if (!payments || !Array.isArray(payments)) {
      throw new Error("Payments Array Required");
    }

    const preorder = await PreOrder.findById(id);
    if (!preorder) throw new Error("Preorder not found");

    if (preorder.status !== "delivered") {
      throw new Error("Preorder not delivered");
    }

    const totalPaid = payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );
    if(totalPaid !== preorder.total){
      throw new Error ("Payment total does not match order total");
    }

    preorder.payments = payments;
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
