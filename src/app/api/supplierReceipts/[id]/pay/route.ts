
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";

type PaymentInput = {
  type: "cash" | "check" | "transfer";
  amount: number;
  checkNumber?: string;
  date?: string;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);

  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid receipt ID" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  if (auth.user?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin authorization required" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  if (
    !body ||
    !Array.isArray(body.payments) ||
    body.payments.length === 0
  ) {
    return NextResponse.json(
      { error: "At least one new payment is required" },
      { status: 400 }
    );
  }

  const normalizedPayments: Array<{
    type: PaymentInput["type"];
    amount: number;
    checkNumber?: string;
    date: Date;
  }> = [];

  for (const payment of body.payments as PaymentInput[]) {
    const amount = payment?.amount;

    if (
      !payment ||
      !["cash", "check", "transfer"].includes(payment.type) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid payment amount or type" },
        { status: 400 }
      );
    }

    const date =
      payment.date == null
        ? new Date()
        : new Date(payment.date);

    if (!Number.isFinite(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid payment date" },
        { status: 400 }
      );
    }

    const checkNumber =
      payment.type === "check"
        ? payment.checkNumber?.trim()
        : undefined;

    if (payment.type === "check" && !checkNumber) {
      return NextResponse.json(
        { error: "Check number is required" },
        { status: 400 }
      );
    }

    normalizedPayments.push({
      type: payment.type,
      amount,
      checkNumber,
      date,
    });
  }

  const session = await mongoose.startSession();

  try {
    let result: any = null;

    await session.withTransaction(async () => {
      const receipt = await SupplierReceipt.findById(id)
        .session(session);

      if (!receipt) {
        throw new Error("RECEIPT_NOT_FOUND");
      }

      if (receipt.paymentStatus === "paid") {
        throw new Error("RECEIPT_ALREADY_PAID");
      }

      const previousPayments = receipt.payments ?? [];

      const previousTotal = previousPayments.reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.amount ?? 0),
        0
      );

      const newTotal = normalizedPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      const totalPaidCents =
        Math.round(previousTotal * 100) +
        Math.round(newTotal * 100);

      const totalCents = Math.round(
        Number(receipt.total) * 100
      );

      if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
        throw new Error("Invalid receipt total");
      }

      if (totalPaidCents > totalCents) {
        throw new Error(
          "Payments exceed the supplier receipt total"
        );
      }

      // Append new payments; never overwrite previous
      // payment records through this endpoint.
      receipt.payments.push(...normalizedPayments);

      const isPaid = totalPaidCents >= totalCents;

      receipt.paymentStatus = isPaid
        ? "paid"
        : "pending";

      if (isPaid) {
        receipt.paidAt = new Date();
      }

      await receipt.save({ session });

      result = {
        success: true,
        paymentStatus: receipt.paymentStatus,
        paidAt: receipt.paidAt,
        totalPaid: totalPaidCents / 100,
        balance: Math.max(
          (totalCents - totalPaidCents) / 100,
          0
        ),
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("SUPPLIER PAYMENT ERROR:", error);

    if (error.message === "RECEIPT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Supplier receipt not found" },
        { status: 404 }
      );
    }

    if (error.message === "RECEIPT_ALREADY_PAID") {
      return NextResponse.json(
        { error: "This receipt is already paid" },
        { status: 409 }
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
          "Failed to record supplier payment",
      },
      { status: 400 }
    );
  } finally {
    await session.endSession();
  }
}