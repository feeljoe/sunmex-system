import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import mongoose from "mongoose";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;

    // ✅ Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid credit memo ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, cancelReason, cancelledBy } = body;

    // ✅ Validate action
    if (action !== "cancel") {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    // ✅ Validate required fields
    if (!cancelReason || !cancelledBy) {
      return NextResponse.json(
        { message: "Cancel reason and cancelledBy are required" },
        { status: 400 }
      );
    }

    const creditMemo = await CreditMemo.findById(id);

    if (!creditMemo) {
      return NextResponse.json(
        { message: "Credit memo not found" },
        { status: 404 }
      );
    }

    // ✅ Prevent double cancellation
    if (creditMemo.status === "cancelled") {
      return NextResponse.json(
        { message: "Credit memo already cancelled" },
        { status: 400 }
      );
    }

    // ✅ Update fields
    creditMemo.status = "cancelled";
    creditMemo.cancelReason = cancelReason;
    creditMemo.cancelledBy = cancelledBy;
    creditMemo.cancelledAt = new Date();

    await creditMemo.save();

    return NextResponse.json(creditMemo, { status: 200 });

  } catch (error: any) {
    console.error("Cancel credit memo error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}