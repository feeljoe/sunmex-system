// app/api/nextPONumber/route.ts
import { connectToDatabase } from "@/lib/db";
import CounterOrder from "@/models/CounterOrder";
import { NextResponse } from "next/server";

export async function GET() {
    await connectToDatabase();
  const counter = await CounterOrder.findOne({ name: "supplierOrder" });
  const currentSeq = counter?.seq ?? 0; // if not exists, default to 0

  return NextResponse.json({
    poNumber: `PO-${1000 + currentSeq}`,
  });
}
