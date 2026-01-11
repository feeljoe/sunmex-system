import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

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
          { error: "User ID is required" },
          { status: 400 }
        );
      }
  
      const deleted = await User.findByIdAndDelete(id);
  
      if (!deleted) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
  
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("DELETE USER ERROR:", err);
      return NextResponse.json(
        { error: err.message || "Failed to delete user" },
        { status: 500 }
      );
    }
  }

  export async function PUT(
    _req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      await connectToDatabase();
  
      // ✅ params must be awaited
      const { id } = await context.params;
  
      if (!id) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
  
      const updated = await User.findByIdAndUpdate(id);
  
      if (!updated) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
  
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("UPDATE USER ERROR:", err);
      return NextResponse.json(
        { error: err.message || "Failed to update user" },
        { status: 500 }
      );
    }
  }