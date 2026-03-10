import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import { DateTime } from "luxon";

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
    console.log("ROUTE FOUND:", route);

    if (!route) {
      return NextResponse.json({ deliveries: [] });
    }
    const phoenixNow = DateTime.now().setZone("America/Phoenix");

    const startOfToday = phoenixNow.startOf("day").toJSDate();

    const endOfToday = phoenixNow.endOf("day").toJSDate();

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
      .populate({
        path: "routeAssigned",
        populate: ({ path: "user"}),
      })
      .lean();

    const orderIds = orders.map(o => o._id);

    const creditMemos = await CreditMemo.find({
      preorder: { $in: orderIds },
      routeAssigned: route._id,
    })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

    const creditMemoMap = new Map<string, any>();

    creditMemos.forEach(cm => {
      creditMemoMap.set(cm.preorder.toString(), cm);
    });

    const formatted = orders.map(order => {
      const creditMemo = creditMemoMap.get(order._id.toString());
    
      const products = order.products
        .map((p: any) => {
          const picked = p.pickedQuantity ?? 0;
    
          return {
            productInventory: p.productInventory._id,
            productId: p.productInventory.product._id,
            name: p.productInventory.product.name,
            brand: p.productInventory.product.brand?.name,
            weight: p.productInventory.product.weight ?? "",
            uom: p.productInventory.product.unit ?? "",
            quantity: picked, // DRIVER SEES PICKED
            deliveredQuantity: p.deliveredQuantity ?? 0,
            unitPrice: p.actualCost ?? 0,
          };
        })
        .filter((p: { quantity: number; }) => p.quantity > 0); // HIDE ZERO PICKED
    
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
          order.client.paymentTerm?.name === "Due on Receipt",
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
        products,
        creditMemo: creditMemo ?? null,
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