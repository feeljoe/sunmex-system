import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import { DateTime } from "luxon";

function addBusinessDays(date: DateTime, days: number): DateTime {
  let result = date;
  const increment = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result = result.plus({ days: increment });
    const weekday = result.weekday; // 1 = Monday, 7 = Sunday
    if (weekday >= 1 && weekday <= 5) remaining--;
  }

  return result;
}
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

    // KEEP IT AS DateTime (don't convert to JS Date)
    const pickUpDay = addBusinessDays(phoenixNow, -2);

    // Start/end of that day in UTC for Mongo query
    const startOfPickUpDay = pickUpDay
      .startOf("day")
      .toUTC()
      .toJSDate();

    const endOfPickUpDay = pickUpDay
      .endOf("day")
      .toUTC()
      .toJSDate();

    const startOfToday = phoenixNow.startOf("day").toUTC().toJSDate();
    const endOfToday = phoenixNow.endOf("day").toUTC().toJSDate();

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
      status: { $in: ["pending", "received"] },
      $or: [
        { preorder: { $exists: false } },
        { preorder: null },
      ],
      createdAt: { $gte: startOfPickUpDay, $lte: endOfPickUpDay }, // <--- only today's pick up
    })
      .populate({
        path: "client",
      })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .populate({
        path: "routeAssigned",
        populate:{path:"user"},
      })
      .lean();

      const formattedStandalone = standaloneCreditMemos.map((cm: any) => {
        const products = cm.products.map((p: any) => ({
          productId: p.product._id,
          upc: p.product.upc,
          sku: p.product.sku,
          name: p.product.name,
          brand: p.product.brand?.name,
          weight: p.product.weight ?? "",
          uom: p.product.unit ?? "",
          quantity: p.quantity,
          deliveredQuantity: p.deliveredQuantity ?? 0,
          unitPrice: p.unitPrice ?? 0,
          returnReason: p.returnReason,
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
            _id: cm.routeAssigned._id,
            code: cm.routeAssigned.code,
            user: {
              _id: cm.routeAssigned.user._id,
              name: cm.routeAssigned.user.firstName + " " + cm.routeAssigned.user.lastName,
            }
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
            sku: p.productInventory.product.sku,
            upc: p.productInventory.product.upc,
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