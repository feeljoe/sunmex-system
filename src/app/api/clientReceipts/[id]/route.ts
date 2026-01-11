import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ClientReceipt from '@/models/ClientReceipt';

export async function DELETE(_req: Request, { params }: { params: { id: string }}) {
  await connectToDatabase();
  await ClientReceipt.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
