import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PricingList from '@/models/PricingList';

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
      PricingList.find(query)
      .populate("productIds", "name")
      .populate("brandIds", "name")
      .populate("clientsAssigned", "clientName")
      .populate("chainsAssigned", "name")
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      PricingList.countDocuments(query),
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
    const payload: any = {
      name: body.name,
      productIds: body.productIds || undefined,
      brandIds: body.brandIds || undefined,
      clientsAssigned: body.clientsAssigned || undefined,
      chainsAssigned: body.chainsAssigned || undefined,
      pricing: body.pricing,
    };

    const created = await PricingList.create(payload);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("PricingList POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}