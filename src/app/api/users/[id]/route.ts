import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

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

  export async function PATCH(
    req: Request,
    context: { params: Promise<{id:string}> }
  ) {
    try{
      await connectToDatabase();
      const { id } = await context.params;
      if(!id) {
        return NextResponse.json({error: "User ID is required"}, {status: 400});
      }
      const body = await req.json();

      const updateData: any = {
        firstName: body.firstName,
        lastName: body.lastName,
        username: body.username,
        email: body.email,
        phoneNumber: body.phoneNumber,
        userRole: body.userRole,
      };

      if(body.password && body.password.trim() !== ""){
        updateData.password = await bcrypt.hash(body.password, 10);
      }

      Object.keys(updateData).forEach(
        key => updateData[key] === undefined && delete updateData[key]
      );

      const updatedUser = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select("-password");

      if(!updatedUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(updatedUser);
    } catch (err: any) {
      console.error("PATCH USER ERROR:", err);
      return NextResponse.json({error: err.message || "Failed to update user" }, { status: 500 });
    }
  }