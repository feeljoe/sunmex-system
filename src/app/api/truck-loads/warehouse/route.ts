import { connectToDatabase } from "@/lib/db";
import TruckLoad from "@/models/TruckLoad";
import { NextResponse } from "next/server";

export async function GET() {
  await connectToDatabase();

  const loads = await TruckLoad.find({
    status: "pending",
  })
    .populate("route")
    .populate({
      path: "products.productInventory",
      populate: {
        path: "product",
        populate: { path: "brand" },
      },
    })
    .sort({ createdAt: -1 });

  return NextResponse.json(loads);
}
