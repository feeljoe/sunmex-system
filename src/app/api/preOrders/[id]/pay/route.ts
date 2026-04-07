import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import { NextResponse } from "next/server";
import CreditMemo from "@/models/CreditMemo";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  await connectToDatabase();
  const { id } = await context.params;

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

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const creditMemos = await CreditMemo.find({
      preorder: preorder._id,
      status: "received",
    });
    const creditTotal = creditMemos.reduce((sum, cm) => sum + cm.total, 0);
    const net = preorder.total - creditTotal;

    preorder.payments = payments;
    preorder.paymentStatus = totalPaid >= net ? "paid": "pending";

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
