import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SupplierOrder from '@/models/SupplierOrder';
import Product from '@/models/Product';

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

export async function PATCH(req: Request, context: { params: Promise<{ id: string }>}) {
  await connectToDatabase();
  const body = await req.json();
  const { id } = await context.params;
  let expectedTotal = 0;

  for (const p of body.products) {
    const product = await Product.findById(p.product).lean();
    const cost = product?.unitCost || 0; // adjust field name
    expectedTotal += cost * p.quantity;
  }
  
  const order = await SupplierOrder.findByIdAndUpdate(
    id,
    {
      supplier: body.supplier,
      products: body.products,
      expectedTotal: expectedTotal,
    },
    { new: true }
  );

  return NextResponse.json(order);
}
