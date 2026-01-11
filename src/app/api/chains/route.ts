import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Chain from '@/models/Chain';
import { ChainSchema } from '@/lib/validators/chain.schema';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
    if(search){
          query.$or = [
            {name: {$regex: search, $options: "i"}},
            ...(isObjectId ? [{ _id: search }] : []),
          ];
        }
    const [items, total] = await Promise.all([
      Chain.find(query)
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      Chain.countDocuments(query),
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
    const data = ChainSchema.parse(body);

    const exists = await Chain.findOne({ name: data.name });
    if (exists) return NextResponse.json({ error: 'Chain already exists' }, { status: 400 });

    const created = await Chain.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
