import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Preorder ID is required" },
        { status: 400 }
      );
    }
    const preorder = await PreOrder.findById(id);
    // 🔁 revert inventory
  for (const item of preorder.products) {
    await ProductInventory.findByIdAndUpdate(item.inventoryId, {
      $inc: {
        currentInventory: item.quantity,
        preSavedInventory: -item.quantity,
      },
    });
  }

   const deleted = await PreOrder.findByIdAndDelete(id);
   if (!deleted) {
    return NextResponse.json(
      { error: "Preorder not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
} catch (err: any) {
  console.error("DELETE PREORDER ERROR:", err);
  return NextResponse.json(
    { error: err.message || "Failed to delete preorder" },
    { status: 500 }
  );
}
}
