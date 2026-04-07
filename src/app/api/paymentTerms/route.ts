import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PaymentTerm from "@/models/PaymentTerm";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    if(search){
          query.$or = [
            {name: {$regex: search, $options: "i"}},
          ];
        }
    const [items, total] = await Promise.all([
      PaymentTerm.find(query)
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      PaymentTerm.countDocuments(query),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      limit
    });
  }catch(err: any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, days, dueOnReceipt } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const paymentTerm = await PaymentTerm.create({
      name,
      days: dueOnReceipt ? 0 : Number(days),
      dueOnReceipt,
    });

    return NextResponse.json(paymentTerm, { status: 201 });
  } catch (error) {
    console.error("PaymentTerms POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
