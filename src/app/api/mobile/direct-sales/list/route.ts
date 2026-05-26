import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sales = await DirectSale.find({ createdBy: user.userId })
      .populate("client")
      .sort({ createdAt: 1 })
      .lean();

    const formatted = sales.map((sale: any) => ({
      directSaleId: sale._id,
      number: sale.number,
      status: "completed",
      client: {
        name: sale.client?.clientName,
        billingAddress: sale.client?.billingAddress,
      },
      products: sale.products,
      totals: {
        total: sale.total,
      },
      createdAt: sale.createdAt,
    }));

    return NextResponse.json({ sales: formatted });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch direct sales" },
      { status: 500 }
    );
  }
}
