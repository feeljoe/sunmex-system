import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ClientReceipt from '@/models/ClientReceipt';
import { ClientReceiptSchema } from '@/lib/validators/clientReceipt.schema';

export async function GET() {
  await connectToDatabase();
  const items = await ClientReceipt.find({});
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const data = ClientReceiptSchema.parse(body);

    const created = await ClientReceipt.create({
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
