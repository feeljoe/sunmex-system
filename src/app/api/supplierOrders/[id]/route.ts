import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SupplierOrder from '@/models/SupplierOrder';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }>}) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

   const deleted = await SupplierOrder.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE ORDER ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete order" },
    { status: 500 }
  );
}
}