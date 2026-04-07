import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import TurnInBatch from "@/models/TurnInBatch";
import Route from "@/models/Route";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const user = await authenticateMobile(req);

    const route = await Route.findOne({
      type: "driver",
      user: user._id,
    });

    const paidOrders = await PreOrder.find({
      routeAssigned: route._id,
      status: "delivered",
      paymentStatus: "paid",
    });

    let totalCash = 0;
    let totalChecks = 0;

    paidOrders.forEach(order => {
      order.payments.forEach((p: any) => {
        if (p.type === "cash") totalCash += p.amount;
        if (p.type === "check") totalChecks += p.amount;
      });
    });

    const batch = await TurnInBatch.create({
      driver: user._id,
      route: route._id,
      orders: paidOrders.map(o => o._id),
      totalCash,
      totalChecks,
      closedAt: new Date(),
    });

    return NextResponse.json({ success: true, batchId: batch._id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}