
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


// Extract user from JWT (Mobile) OR Session (Web)
async function getUser(req: Request) {
  // 1. Try to read the Bearer token sent by the React Native app
  const authHeader = req.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      // Decode the JWT. (Make sure this secret matches the one used in your login route)
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET as string
      ) as any;

      if (decoded && ["admin", "driver", "vendor"].includes(decoded.role)) {
        // Map _id to id if your JWT uses MongoDB's _id
        return {
           ...decoded,
           id: decoded.id || decoded._id 
        };
      }
    } catch (error) {
      console.log("Mobile JWT Verification Failed:", error);
      // We don't throw here yet so it can fall back to checking web cookies
    }
  }

  // 2. Fallback: If no valid header, try NextAuth cookies (for web dashboard)
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["admin"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function PATCH(req: Request) {
  try {
    // Authenticate before accessing payment information.
    const user = await getUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (
      !["admin", "accounting"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const {
      orderId,
      orderType,
      paymentId,
      paymentDate,
    } = await req.json();

    if (
      !mongoose.isValidObjectId(orderId) ||
      !mongoose.isValidObjectId(paymentId) ||
      !["order", "directSale"].includes(orderType) ||
      typeof paymentDate !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid payment update request" },
        { status: 400 }
      );
    }

    // Parse the selected date in the company's timezone.
    const parsedDate = DateTime.fromFormat(
      paymentDate,
      "yyyy-MM-dd",
      {
        zone: "America/Phoenix",
      }
    );

    if (
      !parsedDate.isValid ||
      parsedDate.toFormat("yyyy-MM-dd") !== paymentDate
    ) {
      return NextResponse.json(
        { error: "Invalid payment date" },
        { status: 400 }
      );
    }

    // Store calendar-only accounting dates at noon Phoenix.
    const newPaymentDate = parsedDate
      .set({
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      .toJSDate();

    const Model =
      orderType === "directSale"
        ? DirectSale
        : PreOrder;

    const document = await Model.findById(orderId);

    if (!document) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const payment = document.payments.id(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const previousDate: Date | null =
      payment.paidAt || null;

    const previousDay = previousDate
      ? DateTime.fromJSDate(previousDate)
          .setZone("America/Phoenix")
          .toFormat("yyyy-MM-dd")
      : null;

    if (previousDay === paymentDate) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        paymentId,
        paidAt: payment.paidAt,
        invoicePaidAt: document.paidAt || null,
      });
    }

    const now = new Date();

    const userId = new mongoose.Types.ObjectId(
      user.userId
    );
    if(!Array.isArray(payment.dateChangeHistory)){
        payment.dateChangeHistory = [];
    }

    // Save correction history.
    payment.dateChangeHistory.push({
      previousDate,
      newDate: newPaymentDate,
      changedBy: userId,
      changedAt: now,
    });

    // Update payment date.
    payment.paidAt = newPaymentDate;

    // Track last correction.
    payment.dateUpdatedBy = userId;
    payment.dateUpdatedAt = now;

    // Do not alter amount, method, or paymentStatus.
    // If this date is also the recorded settlement date,
    // keep the invoice-level date synchronized.
    if (
      document.paymentStatus === "paid" &&
      previousDate &&
      document.paidAt &&
      new Date(document.paidAt).getTime() ===
        new Date(previousDate).getTime()
    ) {
      document.paidAt = newPaymentDate;
    }

    await document.save();

    return NextResponse.json({
      success: true,

      orderId: document._id.toString(),
      orderType,
      paymentId: payment._id.toString(),

      paidAt: payment.paidAt,

      invoicePaidAt: document.paidAt || null,

      dateUpdatedAt: payment.dateUpdatedAt,
      dateUpdatedBy: userId.toString(),

      previousDate,
    });

  } catch (error: any) {
    console.error(
      "Update payment date error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to update payment date" },
      { status: 500 }
    );
  }
}
