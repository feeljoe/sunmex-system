
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";

export async function DELETE(
  req: Request,
  context: {
    params: Promise<{
      id: string;
      paymentId: string;
    }>;
  }
) {
  const auth = await getServerSession(authOptions);

  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin authorization required" },
      { status: 403 }
    );
  }

  const { id, paymentId } = await context.params;

  if (
    !mongoose.isValidObjectId(id) ||
    !mongoose.isValidObjectId(paymentId)
  ) {
    return NextResponse.json(
      { error: "Invalid receipt or payment ID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);

  const reason =
    typeof body?.reason === "string"
      ? body.reason.trim()
      : "";

  if (reason.length < 5 || reason.length > 500) {
    return NextResponse.json(
      {
        error:
          "A deletion reason between 5 and 500 characters is required.",
      },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    let responseData: any = null;

    await session.withTransaction(async () => {
      const receipt = await SupplierReceipt.findById(id)
        .session(session);

      if (!receipt) {
        throw new Error("RECEIPT_NOT_FOUND");
      }

      const payment = receipt.payments.id(paymentId);

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      // Save the original values before deleting.
      const originalPayment = payment.toObject();
      const previousStatus = receipt.paymentStatus;
      const previousPaidAt = receipt.paidAt ?? null;

      // Preserve the complete deleted payment record.
      receipt.deletedPayments.push({
        paymentId: payment._id,
        type: payment.type,
        amount: Number(payment.amount),
        checkNumber: payment.checkNumber ?? null,
        date: payment.date ?? null,
        paymentSnapshot: originalPayment,
        deletedBy: auth.user.id,
        deletedAt: new Date(),
        reason,
        previousPaymentStatus: previousStatus,
        previousPaidAt,
      });

      // Remove only the selected active payment.
      payment.deleteOne();

      // Recalculate the paid amount using remaining payments.
      const totalPaidCents = receipt.payments.reduce(
        (sum: number, p: any) => {
          const cents = Math.round(
            Number(p.amount) * 100
          );

          if (!Number.isSafeInteger(cents) || cents < 0) {
            throw new Error("Invalid remaining payment amount");
          }

          return sum + cents;
        },
        0
      );

      const invoiceTotalCents = Math.round(
        Number(receipt.total) * 100
      );

      if (
        !Number.isSafeInteger(invoiceTotalCents) ||
        invoiceTotalCents < 0 ||
        !Number.isSafeInteger(totalPaidCents) ||
        totalPaidCents > invoiceTotalCents
      ) {
        throw new Error(
          "Invalid payment totals after deletion"
        );
      }

      const remainingBalanceCents =
        invoiceTotalCents - totalPaidCents;

      const isPaid = remainingBalanceCents === 0;

      receipt.paymentStatus = isPaid
        ? "paid"
        : "pending";

      // A reopened invoice is no longer fully paid.
      // If it remains fully paid, preserve its existing timestamp.
      if (!isPaid) {
        receipt.paidAt = null;
      }

      await receipt.save({ session });

      responseData = {
        success: true,
        message: "Payment deleted successfully",
        receiptId: receipt._id,
        deletedPaymentId: paymentId,
        paymentStatus: receipt.paymentStatus,
        paidAt: receipt.paidAt,
        totalPaid: totalPaidCents / 100,
        balance: remainingBalanceCents / 100,
        remainingPayments: receipt.payments.length,
      };
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error(
      "SUPPLIER PAYMENT DELETE ERROR:",
      error
    );

    if (error.message === "RECEIPT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Supplier receipt not found" },
        { status: 404 }
      );
    }

    if (error.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        {
          error:
            "Payment not found. It may have already been deleted.",
        },
        { status: 404 }
      );
    }

    if (
      error.code === 112 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      return NextResponse.json(
        {
          error:
            "Receipt was modified. Refresh and retry.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to delete supplier payment",
      },
      { status: 400 }
    );
  } finally {
    await session.endSession();
  }
}
