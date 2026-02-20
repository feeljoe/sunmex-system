import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const user = await authenticateMobile(req);

    if (user.userRole !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const route = await Route.findOne({
      type: "driver",
      user: user._id,
    });

    if (!route) {
      return NextResponse.json({ deliveries: [] });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const orders = await PreOrder.find({
      routeAssigned: route._id,
      deliveryDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $in: ["ready", "delivered"] },
    })
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
      .lean();

    const clientIds = orders.map(o => o.client._id);

    const creditMemos = await CreditMemo.find({
      client: { $in: clientIds },
      routeAssigned: route._id,
      status: "pending",
    })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

    const creditMemoMap = new Map<string, any>();

    creditMemos.forEach(cm => {
      creditMemoMap.set(cm.client.toString(), cm);
    });

    const formatted = orders.map(order => {
      const creditMemo = creditMemoMap.get(order.client._id.toString());

      const products = order.products.map((p: any) => ({
        productId: p.productInventory.product._id,
        name: p.productInventory.product.name,
        brand: p.productInventory.product.brand?.name,
        quantity: p.quantity,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        unitPrice: p.productInventory.product.unitPrice,
      }));

      return {
        orderId: order._id,
        number: order.number,
        status: order.status,
        client: {
          id: order.client._id,
          name: order.client.clientName,
          billingAddress: order.client.billingAddress,
        },
        totals: {
          subtotal: order.subtotal,
          total: order.total,
        },
        requiresPayment:
          order.client.paymentTerm?.name === "Due On Receipt",
        products,
        creditMemo: creditMemo
          ? {
              id: creditMemo._id,
              number: creditMemo.number,
              total: creditMemo.total,
              products: creditMemo.products.map((cp: any) => ({
                productId: cp.product._id,
                name: cp.product.name,
                quantity: cp.quantity,
                pickedQuantity: cp.pickedQuantity,
              })),
            }
          : null,
      };
    });

    return NextResponse.json({ deliveries: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}