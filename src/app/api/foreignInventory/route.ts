import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ForeignInventory from "@/models/ForeignInventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const LOCATIONS = ["yuma", "tucson", "elPaso", "lasVegas"];

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");

    if (!location || !LOCATIONS.includes(location)) {
      return NextResponse.json(
        { error: "Invalid location" },
        { status: 400 }
      );
    }

    const inventory = await ForeignInventory.find({
      location,
    })
      .populate({
        path: "product",
        populate: {
          path: "brand",
        },
      })
      .sort({ "product.brand.name": 1 })
      .lean();

    return NextResponse.json({
      location,
      items: inventory,
    });
  } catch (err: any) {
    console.error("FOREIGN INVENTORY GET ERROR: ", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}