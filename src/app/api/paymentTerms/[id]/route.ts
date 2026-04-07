import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PaymentTerm from '@/models/PaymentTerm';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }>}) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Payment Term ID is required" },
        { status: 400 }
      );
    }

   const deleted = await PaymentTerm.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Payment Term not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE PAYMENT TERM ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete payment term" },
    { status: 500 }
  );
}
}

