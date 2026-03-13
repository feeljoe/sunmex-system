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

    // -----------------------------
    // Try to fetch preorder first
    // -----------------------------
    let order = await PreOrder.findById(id)
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
        .lean();

      if (!creditMemo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Format standalone credit memo for driver
      const products = creditMemo.products.map((p: any) => ({
        productId: p.product._id,
        name: p.product.name,
        brand: p.product.brand?.name,
        quantity: p.quantity,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        weight: p.product.weight ?? "",
        uom: p.product.unit ?? "",
        unitPrice: p.unitPrice ?? 0,
      }));

      const formatted = {
        orderId: creditMemo._id,
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
              user: {
                _id: creditMemo.routeAssigned.user._id,
                name:
                  creditMemo.routeAssigned.user.firstName +
                  " " +
                  creditMemo.routeAssigned.user.lastName,
              },
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

    const products = order.products
      .map((p: any) => ({
        productInventory: p.productInventory._id,
        productId: p.productInventory.product._id,
        name: p.productInventory.product.name,
        brand: p.productInventory.product.brand?.name,
        quantity: p.pickedQuantity ?? 0,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        weight: p.productInventory.product.weight ?? "",
        uom: p.productInventory.product.unit ?? "",
        unitPrice: p.actualCost ?? 0,
      }))
      .filter((p: any) => p.quantity > 0);

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
      standalone: false,
    };

    return NextResponse.json(formatted);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}