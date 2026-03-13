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

    if (!route) {
      return NextResponse.json({ deliveries: [] });
    }
    const phoenixNow = DateTime.now().setZone("America/Phoenix");

    const startOfToday = DateTime.fromObject(
      {
        year: phoenixNow.year,
        month: phoenixNow.month,
        day: phoenixNow.day,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: "UTC" } // force UTC for Mongo query
    ).toJSDate();
    
    const endOfToday = DateTime.fromObject(
      {
        year: phoenixNow.year,
        month: phoenixNow.month,
        day: phoenixNow.day,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      },
      { zone: "UTC" }
    ).toJSDate();

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

    const standaloneCreditMemos = await CreditMemo.find({
      routeAssigned: route._id,
      $or: [
        { preorder: { $exists: false } },
        { preorder: null },
      ],
    })
      .populate({
        path: "client",
      })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

      const formattedStandalone = standaloneCreditMemos.map((cm: any) => {
        const products = cm.products.map((p: any) => ({
          productId: p.product._id,
          name: p.product.name,
          brand: p.product.brand?.name,
          weight: p.product.weight ?? "",
          uom: p.product.unit ?? "",
          quantity: p.quantity,
          deliveredQuantity: p.deliveredQuantity ?? 0,
          unitPrice: p.unitPrice ?? 0,
        }));
        return {
          orderId: null, // important so the app knows it's not an order
          creditMemoId: cm._id,
          number: cm.number,
          status: cm.status,
          client: {
            id: cm.client._id,
            name: cm.client.clientName,
            billingAddress: cm.client.billingAddress,
          },
          totals: {
            subtotal: cm.subtotal,
            total: cm.total,
          },
          requiresPayment: false,
          payments: [],
          routeAssigned: {
            _id: route._id,
            code: route.code,
          },
          products,
          creditMemo: cm,
        };
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

    return NextResponse.json({ deliveries: [...formatted, ...formattedStandalone] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}