import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import { formatPreOrderProducts } from "@/utils/mobileDeliveriesFormatter";

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
    

    // -----------------------------
    // Try to fetch preorder first
    // -----------------------------
    let order = await PreOrder.findById(id)
      .populate({
        path: "client",
        populate: { path: "paymentTerm" },
      })
      .populate({
        path: "routeAssigned",
        populate: { path: "user" },
      })
      .lean();

    // -----------------------------
    // If no preorder, try credit memo directly
    // -----------------------------
    let creditMemo: any = null;

    if (!order) {
      creditMemo = await CreditMemo.findById(id)
        .populate({
          path: "client",
          populate: { path: "paymentTerm" },
        })
        .populate({
          path: "products.product",
          populate: { path: "brand" },
        })
        .populate({
          path: "routeAssigned",
          populate: { path: "user" },
        })
        .lean();

      if (!creditMemo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Format standalone credit memo for driver
      const products = creditMemo.products.map((p: any) => ({
        _id: p._id,
        productId: p.product._id,
        sku: p.product.sku,
        upc: p.product.upc,
        name: p.product.name,
        brand: p.product.brand?.name,
        quantity: p.quantity,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        returnReason: p.returnReason,
        weight: p.product.weight ?? "",
        uom: p.product.unit ?? "",
        unitPrice: p.unitPrice ?? 0,
      }));

      const formatted = {
        orderId: null,
        creditMemoId: creditMemo._id,
        number: creditMemo.number,
        status: creditMemo.status,
        deliveryDate: creditMemo.deliveryDate ?? null,
        client: {
          _id: creditMemo.client._id,
          name: creditMemo.client.clientName,
          billingAddress: creditMemo.client.billingAddress,
          paymentTerm: creditMemo.client.paymentTerm,
        },
        payments: creditMemo.payments ?? [],
        routeAssigned: creditMemo.routeAssigned
          ? {
              _id: creditMemo.routeAssigned._id,
              code: creditMemo.routeAssigned.code,
              user: creditMemo.routeAssigned.user
              ? {
                _id: creditMemo.routeAssigned.user._id,
                name:
                  creditMemo.routeAssigned.user.firstName +
                  " " +
                  creditMemo.routeAssigned.user.lastName,
              }
              : null,
            }
          : null,
        totals: {
          subtotal: creditMemo.subtotal ?? 0,
          total: creditMemo.total ?? 0,
        },
        products,
        creditMemo: creditMemo,
        standalone: true,
      };

      return NextResponse.json(formatted);
    }

    // -----------------------------
    // Existing logic for preorder
    // -----------------------------
    if (order.status !== "ready" && order.status !== "delivered") {
      return NextResponse.json(
        { error: "Order not available for delivery" },
        { status: 400 }
      );
    }

    creditMemo = await CreditMemo.findOne({ preorder: order._id })
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .lean();

    const {inventoryLocation, products,} = await formatPreOrderProducts(order);

    const formatted = {
      orderId: order._id,
      number: order.number,
      status: order.status,
      inventoryLocation,
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
      standalone: false,
    };

    return NextResponse.json(formatted);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}