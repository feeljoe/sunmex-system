import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const user = await authenticateMobile(req);

    if (user.userRole !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { payments } = await req.json();

    const order = await PreOrder.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Order must be delivered first" },
        { status: 400 }
      );
    }

    const totalReceived = payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );

    if (Number(totalReceived.toFixed(2)) !== Number(order.total.toFixed(2))) {
      return NextResponse.json(
        { error: "Payment total does not match order total" },
        { status: 400 }
      );
    }

    order.payments = payments;
    order.paymentStatus = "paid";

    await order.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}