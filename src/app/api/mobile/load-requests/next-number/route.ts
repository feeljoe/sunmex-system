import { connectToDatabase } from "@/lib/db";
import CounterLoadRequest from "@/models/CounterLoadRequest";
import { NextResponse } from "next/server";

export async function GET() {
    await connectToDatabase();
  const counter = await CounterLoadRequest.findOne({ name: "loadRequest" });
  const currentSeq = counter?.seq ?? 0; // if not exists, default to 0

  return NextResponse.json({
    nextNumber: `LR-${1000 + currentSeq}`,
  });
}