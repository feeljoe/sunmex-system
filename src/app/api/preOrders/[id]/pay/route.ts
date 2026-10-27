import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import { NextResponse } from "next/server";
import CreditMemo from "@/models/CreditMemo";
import PaymentOperation from "@/models/PaymentOperation";
import { getPaymentOperationId, hashPaymentRequest } from "@/lib/paymentIdempotency";
import mongoose, { mongo } from "mongoose";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await context.params;

  let operationId: string | null = null;
  let requestHash = "";

  try {
    operationId = getPaymentOperationId(req);

    const body = await req.json();

    const { payments, discountPercent = 0 } = body;

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ errpr: "Payments are required" }, { status: 400 });
    }
    const discount = Number(discountPercent);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return NextResponse.json({ error: "Invalid discount percentage" }, { status: 400 });
    }
    const validatedPayments = payments.map((p: any) => {
      const amount = Number(p.amount);
      if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
        throw new Error("Invalid payment amount");
      }
      if (!["cash", "check"].includes(p.type)) {
        throw new Error("Invalid payment type");
      }
      if (p.type === "check" && !String(p.checkNumber ?? "").trim()) {
        throw new Error("Check number is required");
      }
      return {
        _id: p._id,
        type: p.type,
        amount,
        checkNumber: p.type === "check" ? String(p.checkNumber).trim() : undefined,
      };
    });
    requestHash = hashPaymentRequest({
      documentType: "preorder",
      documentId: id,
      payments: validatedPayments,
      discountPercent: discount,
    });
    if (operationId) {
      const previous = await PaymentOperation.findOne({ operationId }).lean();
      if (previous) {
        if (previous.documentType !== "preorder" || String(previous.documentId) !== id || previous.requestHash !== requestHash) {
          return NextResponse.json({ error: "Idempotency Key was already used for a different payment request" }, { status: 409 });
        }
        return NextResponse.json(previous.result);
      }
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const preorder = await PreOrder.findById(id).session(session);

      if (!preorder) throw new Error("Preorder not found");

      if(preorder.status !== "delivered") {
        throw new Error("The preorder must be delivered before its payment can be processed");
      }

      const now = new Date();
      const previousPayments = preorder.payments || [];

      const updatedPayments = validatedPayments.map((payment: any) => {
        const existingPayment = payment._id ? previousPayments.find((p: any) =>
          p._id.toString() === payment._id.toString()) : null;
        return {
          ...payment,
          amount: Number(payment.amount),
          paidAt: existingPayment ? existingPayment.paidAt || now : now,
          recordedAt: existingPayment ? existingPayment.recordedAt || now : now,
        };
      });

      const totalPaidCents = updatedPayments.reduce((sum: any, p: { amount: any; }) => sum + Math.round(Number(p.amount || 0) * 100), 0);

      const creditMemos = await CreditMemo.find({
        preorder: preorder._id,
        status: "received",
      }).session(session);

      const creditTotalCents = creditMemos.reduce((sum, cm) => sum + Math.round(Number(cm.total ?? 0) * 100), 0);

      let netCents = Math.round(Number(preorder.total) * 100) - creditTotalCents;
      netCents = Math.round(netCents * (1 - discount / 100));

      if(netCents < 0) {
        throw new Error("Invalid payment balance");
      }

      const wasPaid = preorder.paymentStatus === "paid";
      const isPaid = totalPaidCents >= netCents - 1;

      preorder.payments = updatedPayments;
      preorder.paymentStatus = isPaid ? "paid" : "pending";

      if (isPaid && !wasPaid) {
        preorder.paidAt = now;
      } else if (!isPaid) {
        preorder.paidAt = null;
      }

      await preorder.save({ session });

      if (isPaid) {
        await CreditMemo.updateMany(
          { preorder: preorder._id, status: "received" },
          { $set: { paymentProcessed: true } },
          { session }
        );
      }
      const result = {
        success: true,
        paymentStatus: preorder.paymentStatus,
        paidAt: preorder.paidAt,
      };
      if(operationId) {
        await PaymentOperation.create([{
          operationId,
          documentType: "preorder",
          documentId: preorder._id,
          requestHash,
          result,
        }], { session });
      }
      await session.commitTransaction();

      return NextResponse.json(result);

    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch(err: any) {
    if(operationId) {
      const previous = await PaymentOperation.findOne({operationId}).lean();
      if(previous) {
        if(previous.documentType === "preorder" && String(previous.documentId) === id && previous.requestHash === requestHash) {
          return NextResponse.json(previous.result);
        }
        return NextResponse.json({error: "Idempotency key conflict"}, {status: 409});
      }
    }
    console.error("Preorder payment error: ", err);
    if(err?.code === 11000 || err?.hasErrorLabel?.("TransientTransactionError")) {
      return NextResponse.json({error: "Payment operation is being resolved, retry using the same operation ID."}, {status: 503});
    }
    return NextResponse.json({error: err.message || "Failed to process payment"}, {status: 400});
  }
}