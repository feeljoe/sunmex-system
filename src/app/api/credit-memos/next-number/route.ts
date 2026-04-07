import { connectToDatabase } from "@/lib/db";
import CounterCreditMemo from "@/models/CounterCreditMemo";
import { NextResponse } from "next/server";

export async function GET() {
    await connectToDatabase();
  const counter = await CounterCreditMemo.findOne({ name: "creditmemo" });
  const currentSeq = counter?.seq ?? 0; // if not exists, default to 0

  return NextResponse.json({
    nextNumber: `CRM-${1000 + currentSeq}`,
  });
}