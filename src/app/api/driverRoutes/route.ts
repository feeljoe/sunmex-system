import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DriverRoute from '@/models/DriverRoute';
import { DriverRouteSchema } from '@/lib/validators/driverRoute.schema';

export async function GET() {
  await connectToDatabase();
  const items = await DriverRoute.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const data = DriverRouteSchema.parse(body);

    const created = await DriverRoute.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
