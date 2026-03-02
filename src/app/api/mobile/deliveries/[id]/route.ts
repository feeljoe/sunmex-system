import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const user = await authenticateMobile(req);

    if (user.userRole !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const order = await PreOrder.findById(id)
      .populate({
        path: "client",
        populate: { path: "paymentTerm" },
      })
      .populate({
        path: "products.productInventory",
        populate: {
          path: "product",
          populate: { path: "brand" },
        },
      })
      .populate("routeAssigned")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const creditMemo = await CreditMemo.findOne({
      client: order.client._id,
      routeAssigned: order.routeAssigned,
      status: "pending",
    })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

    const formatted = {
      orderId: order._id,
      number: order.number,
      status: order.status,
      deliveryDate: order.deliveryDate,
      client: {
        _id: order.client._id,
        name: order.client.clientName,
        billingAddress: order.client.billingAddress,
        paymentTerm: order.client.paymentTerm,
      },
      totals: {
        subtotal: order.subtotal,
        total: order.total,
      },
      products: order.products,
      creditMemo: creditMemo
        ? {
            _id: creditMemo._id,
            total: creditMemo.total,
            products: creditMemo.products,
          }
        : null,
    };

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}