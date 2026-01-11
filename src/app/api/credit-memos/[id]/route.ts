import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const creditMemo = await CreditMemo.findById(params.id);
    if (!creditMemo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // =========================
    // RECEIVE CREDIT MEMO
    // =========================
    if (body.action === "receive") {
      creditMemo.products = creditMemo.products.map((p: any) => {
        const updated = body.products.find(
          (u: any) =>
            u.productInventory === p.productInventory.toString()
        );

        if (!updated) return p;

        return {
          ...p.toObject(),
          pickedQuantity: updated.pickedQuantity,
          returnedQuantity: updated.returnedQuantity,
        };
      });

      creditMemo.total = body.total;
      creditMemo.status = "received";
      creditMemo.returnedAt = new Date();
      creditMemo.returnSignature = body.returnSignature;
    }

    // =========================
    // CANCEL CREDIT MEMO
    // =========================
    if (body.action === "cancel") {
      creditMemo.cancelledAt = new Date();
      creditMemo.cancelledBy = body.cancelledBy;
      creditMemo.cancelReason = body.cancelReason;
      creditMemo.status = "pending"; // or "cancelled" if you add enum
    }

    await creditMemo.save();

    return NextResponse.json(creditMemo);
  } catch (error: any) {
    console.error("PATCH CreditMemo error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
