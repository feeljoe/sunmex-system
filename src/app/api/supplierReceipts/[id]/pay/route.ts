// app/api/supplierReceipts/[id]/pay/route.ts
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  await connectToDatabase();
  const { id } = await context.params;

  try {
    const { payments } = await req.json();

    const receipt = await SupplierReceipt.findById(id);
    if (!receipt) throw new Error("Receipt not found");

    // Calculate total paid from the new array
    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    // Apply payments
    receipt.payments = payments;
    
    // Check if total paid covers the invoice total (allowing for small float deviations)
    receipt.paymentStatus = totalPaid >= (receipt.total - 0.01) ? "paid" : "pending";

    await receipt.save();

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}