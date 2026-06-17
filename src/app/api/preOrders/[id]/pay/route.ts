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
    const { payments, discountPercent = 0 } = await req.json();

    const preorder = await PreOrder.findById(id);
    if (!preorder) throw new Error("Preorder not found");

    const totalPaid = payments.reduce((sum: any, p: { amount: any; }) => sum + p.amount, 0);

    const creditMemos = await CreditMemo.find({
      preorder: preorder._id,
      status: "received",
    });

    const creditTotal = creditMemos.reduce((sum, cm) => sum + cm.total, 0);

    let net = preorder.total - creditTotal;

    // APPLY DISCOUNT
    if (discountPercent > 0) {
      net = net - (net * (discountPercent / 100));
    }

    preorder.payments = payments;
    preorder.paymentStatus = totalPaid >= net ? "paid" : "pending";

    await preorder.save();

    if (preorder.paymentStatus === "paid") {
      await CreditMemo.updateMany(
        { preorder: preorder._id, status: "received" },
        { $set: { paymentProcessed: true } }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}