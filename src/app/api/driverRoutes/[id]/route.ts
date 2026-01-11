import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DriverRoute from '@/models/DriverRoute';

export async function DELETE(_req: Request, { params }: { params: { id: string }}) {
  await connectToDatabase();
  await DriverRoute.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
