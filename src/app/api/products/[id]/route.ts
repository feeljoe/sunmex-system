import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      await connectToDatabase();
  
      // ✅ params must be awaited
      const { id } = await context.params;
  
      if (!id) {
        return NextResponse.json(
          { error: "Product ID is required" },
          { status: 400 }
        );
      }
  
      const deleted = await Product.findByIdAndDelete(id);
  
      if (!deleted) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
  
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("DELETE PRODUCT ERROR:", err);
      return NextResponse.json(
        { error: err.message || "Failed to delete product" },
        { status: 500 }
      );
    }
  }