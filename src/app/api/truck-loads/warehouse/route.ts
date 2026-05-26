import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import { NextResponse } from "next/server";

export async function GET() {
  await connectToDatabase();

  const loads = await Route.find({
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
