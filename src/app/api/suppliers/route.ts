import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Supplier from '@/models/Supplier';
import { SupplierSchema } from '@/lib/validators/supplier.schema';

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
      Supplier.find(query)
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      Supplier.countDocuments(query),
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
  await connectToDatabase();
  try {
    const body = await req.json();
    const data = SupplierSchema.parse(body);

    const created = await Supplier.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
