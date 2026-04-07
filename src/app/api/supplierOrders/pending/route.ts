import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SupplierOrder from "@/models/SupplierOrder";

export async function GET() {
  try {
    await connectToDatabase();

    const orders = await SupplierOrder.find({ status: "pending" })
      .populate("supplier")
      .populate({
        path: "products.product",
        populate: { path: "brand" },
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error("Get pending supplier orders error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
