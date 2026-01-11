import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Client from '@/models/Client';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }>}) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

   const deleted = await Client.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE CLIENT ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete client" },
    { status: 500 }
  );
}
}