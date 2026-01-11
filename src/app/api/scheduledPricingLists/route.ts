import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ScheduledPricingList from '@/models/ScheduledPricingList';
import { ScheduledPricingListSchema } from '@/lib/validators/scheduledPricingList.schema';

export async function GET() {
  await connectToDatabase();
  const items = await ScheduledPricingList.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const data = ScheduledPricingListSchema.parse(body);

    const created = await ScheduledPricingList.create({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
