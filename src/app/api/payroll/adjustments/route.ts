// app/api/payroll/adjustments/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PayrollAdjustment from "@/models/PayrollAdjustment";

export async function GET() {
  try {
    await connectToDatabase();
    // Fetch all pending adjustments and populate the user's name
    const adjustments = await PayrollAdjustment.find({ processed: false })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(adjustments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const newAdjustment = await PayrollAdjustment.create({
      user: body.userId,
      type: body.type, // 'bonus' or 'deduction'
      amount: Number(body.amount),
      reason: body.reason,
      date: new Date(),
      processed: false,
      createdBy: body.adminId, // The user ID making the change
    });

    return NextResponse.json(newAdjustment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}