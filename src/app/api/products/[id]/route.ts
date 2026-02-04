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

  export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      await connectToDatabase();
      const { id } = await context.params;
      const body = await req.json();
  
      // Remove undefined fields so they don't overwrite anything
      Object.keys(body).forEach(
        key => body[key] === undefined && delete body[key]
      );
  
      const updated = await Product.findByIdAndUpdate(
        id,
        { $set: body },
        {
          new: true,
          runValidators: true,
        }
      );
  
      if (!updated) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
  
      return NextResponse.json(updated, { status: 200 });
    } catch (err: any) {
      console.error("Product update error:", err);
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      );
    }
  }
  