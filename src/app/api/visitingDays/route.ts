import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import VisitingDay from '@/models/VisitingDay';
import { VisitingDaySchema } from '@/lib/validators/visitingDay.schema';

export async function GET() {
  await connectToDatabase();
  const items = await VisitingDay.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const data = VisitingDaySchema.parse(body);

    const created = await VisitingDay.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
