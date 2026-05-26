import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Type from '@/models/Type';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [items, total] = await Promise.all([
      Type.find(query)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Type.countDocuments(query),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const exists = await Type.findOne({ name: body.name });
    if (exists) return NextResponse.json({ error: 'Type already exists' }, { status: 400 });

    const created = await Type.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}