import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Brand from '@/models/Brand';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }>}) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

   const deleted = await Brand.findByIdAndDelete(id);
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

export async function PATCH(req: Request, context: {params: Promise<{id: string}>}) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if(!session?.user?.id) {
      return NextResponse.json({error: "unauthorized"}, {status:401});
    }
    if(session?.user?.role !== "admin") {
      return NextResponse.json({error: "Forbidden"}, {status:403});
    }
    const {id} = await context.params;
    if(!mongoose.isValidObjectId(id)) {
      return NextResponse.json({error: "Invalid Brand ID"}, {status:400});
    }
    const body = await req.json().catch(() => null);
    if(!body || typeof body !== "object" || Array.isArray(body)){
      return NextResponse.json({error: "Invalid request body"}, {status:400});
    }
    const updates: Record<string, any> = {};
    if(body.name !== undefined) {
      if(typeof body.name !== "string" || !body.name.trim()){
        return NextResponse.json({error: "Brand name is required"}, {status:400});
      }
      updates.name = body.name.trim();
    }
    if (body.status !== undefined) {
      if(!["active", "inactive"].includes(body.status)){
        return NextResponse.json({error: "Status must be active or inactive"}, {status:400});
      }
      updates.status = body.status;
    }
    if(Object.keys(updates).length === 0){
      return NextResponse.json({error: "No changes provided"}, {status: 400});
    }
    const updated = await Brand.findByIdAndUpdate(id,
      {$set: updates},
      {new: true, runValidators: true}
    );
    if(!updated){
      return NextResponse.json({error: "Brand not found"}, {status:400});
    }
    return NextResponse.json({success: true, brand: updated});
  } catch(error: any) {
    console.log("BRAND UPDATE ERROR: ", error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "Brand name already exists" },
        { status: 409 }
      );
    }

    if (error?.name === "ValidationError") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error.message || "Unable to update brand",
      },
      { status: 500 }
    );
  }
}