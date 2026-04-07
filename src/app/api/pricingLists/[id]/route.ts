import { connectToDatabase } from "@/lib/db";
import PricingList from "@/models/PricingList";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }>}) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Pricing List ID is required" },
        { status: 400 }
      );
    }

   const deleted = await PricingList.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Pricing List not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE PRICING LIST ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete pricing list" },
    { status: 500 }
  );
}
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }>}){
  await connectToDatabase();
  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)){
    return NextResponse.json({error: "Invalid ID"}, {status: 400});
  }

  const body = await req.json();
  const {name, pricing, brandIds, productIds, clientsAssigned, chainsAssigned} = body;

  try{
    const updated = await PricingList.findByIdAndUpdate(
      id,
      {
        name,
        pricing,
        brandIds,
        productIds,
        clientsAssigned,
        chainsAssigned,
      },
      {new: true}
    );
    if(!updated) {
      return NextResponse.json({error: "Pricing Lsit not found"}, {status: 404});
    }

    return NextResponse.json(updated);
  }catch(err: any) {
    return NextResponse.json({error: err.message}, {status:500});
  }
}