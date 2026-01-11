import { connectToDatabase } from "@/lib/db";
import CounterOrder from "@/models/CounterOrder";
import SupplierOrder from "@/models/SupplierOrder";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    await connectToDatabase();
    const body = await req.json();

    const counter = await CounterOrder.findOneAndUpdate(
        {name: "supplierOrder" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true}
    );
    const poNumber =  `PO-${1000 + counter.seq}`;

    const order = await SupplierOrder.create({
        poNumber,
        supplier: body.supplier,
        products: body.products,
        elaboratedBy: body.elaboratedBy,
        requestedAt: new Date(),
        status: "pending",
        expectedTotal: body.expectedTotal,
    });

    return NextResponse.json(order);
}

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
            {poNumber: {$regex: search, $options: "i"}},
            {supplier: {$regex: search, $options: "i"}},
          ];
        }
    const [items, total] = await Promise.all([
      SupplierOrder.find(query)
      .populate("supplier")
      .populate("products.product")
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      SupplierOrder.countDocuments(query),
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