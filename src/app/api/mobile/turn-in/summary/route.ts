import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await authenticateMobile(req);

    const route = await Route.findOne({
      type: "driver",
      user: user._id,
    });

    const orders = await PreOrder.find({
      routeAssigned: route._id,
      status: "delivered",
    })
      .populate("client")
      .lean();

    let totalCash = 0;
    let totalChecks = 0;

    const summary = orders.map(order => {
      let orderCash = 0;
      let orderChecks = 0;

      if (order.paymentStatus === "paid") {
        order.payments.forEach((p: any) => {
          if (p.type === "cash") orderCash += p.amount;
          if (p.type === "check") orderChecks += p.amount;
        });

        totalCash += orderCash;
        totalChecks += orderChecks;
      }

      return {
        orderId: order._id,
        clientName: order.client.clientName,
        total: order.total,
        paymentStatus: order.paymentStatus,
        payments: order.payments,
      };
    });

    return NextResponse.json({
      orders: summary,
      totalCash,
      totalChecks,
      grandTotal: totalCash + totalChecks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}