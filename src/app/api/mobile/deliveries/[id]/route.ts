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
      .populate({
        path: "routeAssigned",
        populate: { path: "user" },
      })
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 🔒 Optional but recommended:
    if (order.status !== "ready" && order.status !== "delivered") {
      return NextResponse.json({ error: "Order not available for delivery" }, { status: 400 });
    }

    const creditMemo = await CreditMemo.findOne({
      preorder: order._id,
      status: "pending",
    })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

    // 🔥 Normalize products for driver
    const products = order.products
      .map((p: any) => {
        const picked = p.pickedQuantity ?? 0;

        return {
          productId: p.productInventory.product._id,
          name: p.productInventory.product.name,
          brand: p.productInventory.product.brand?.name,
          quantity: picked, // DRIVER SEES PICKED
          deliveredQuantity: p.deliveredQuantity ?? 0,
          unitPrice: p.actualCost ?? 0,
        };
      })
      .filter((p: any) => p.quantity > 0); // HIDE ZERO PICKED

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
      payments: order.payments ?? [],
      routeAssigned: {
        _id: order.routeAssigned._id,
        code: order.routeAssigned.code,
        user: {
          _id: order.routeAssigned.user._id,
          name:
            order.routeAssigned.user.firstName +
            " " +
            order.routeAssigned.user.lastName,
        },
      },
      totals: {
        subtotal: order.subtotal,
        total: order.total,
      },
      products,
      creditMemo: creditMemo ?? null,
    };

    return NextResponse.json(formatted);

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}