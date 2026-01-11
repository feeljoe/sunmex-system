import { connectToDatabase } from "@/lib/db";
import CounterPreorder from "@/models/CounterPreorder";
import { NextResponse } from "next/server";

export async function GET() {
    await connectToDatabase();
  const counter = await CounterPreorder.findOne({ name: "preorder" });
  const currentSeq = counter?.seq ?? 0; // if not exists, default to 0

  return NextResponse.json({
    nextNumber: `INV-${1000 + currentSeq}`,
  });
}