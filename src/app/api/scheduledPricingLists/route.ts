import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ScheduledPricingList from '@/models/ScheduledPricingList';

export async function GET() {
  await connectToDatabase();
  const items = await ScheduledPricingList.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();

    const created = await ScheduledPricingList.create({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
