// app/api/accounting/bulk-pay/route.ts
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  await connectToDatabase();
  try {
    const { orderIds, dsIds, cmIds, method, checkNumber, totalAmount, discountPercent = 0 } = await req.json();

    const orders = await PreOrder.find({ _id: { $in: orderIds } });
    const directSales = await DirectSale.find({ _id: { $in: dsIds } });
    const cms = await CreditMemo.find({ _id: { $in: cmIds } });

    let remainingCash = Number(totalAmount) || 0;
    let remainingUnlinkedCredit = cms.reduce((sum, cm) => sum + Math.abs(cm.total), 0);

    const processDocument = async (doc: any, Model: any, isDirectSale = false) => {
      const query = isDirectSale ? { directSale: doc._id, status: "received", paymentProcessed: { $ne: true } }: { preorder: doc._id, status: "received", paymentProcessed: {$ne: true} };
      const linkedCMs = await CreditMemo.find(query);

      for (const cm of linkedCMs) {
        doc.payments.push({ type: "creditMemo", amount: Math.abs(cm.total) });
        cm.paymentProcessed = true;
        await cm.save();
      }

      if (discountPercent > 0) {
        const discountAmount = doc.total * (discountPercent/100);
        doc.payments.push({type: "discount", amount: discountAmount});
      }
    
       const paidSoFar = doc.payments?.reduce((s: any, p: any) => s + p.amount, 0);

       let currentBalance = Math.max(doc.total - paidSoFar, 0);

       if (currentBalance > 0 && remainingUnlinkedCredit > 0) {
        const applyCredit = Math.min(currentBalance, remainingUnlinkedCredit);
        doc.payments.push({ type: "creditMemo", amount: applyCredit });
        remainingUnlinkedCredit -= applyCredit;
        currentBalance -= applyCredit;
       }

       // Apply payment if there is balance and we still have check funds
       if (currentBalance > 0 && remainingCash > 0) {
          const applyCash = Math.min(currentBalance, remainingCash);
          
          doc.payments.push({
             type: method,
             amount: applyCash,
             checkNumber: method === "check" ? checkNumber : undefined
          });

          remainingCash -= applyCash;
          currentBalance -= applyCash;
        }
          
          const finalPaidSoFar = doc.payments.reduce((s: any, p: any) => s + p.amount, 0);
          doc.paymentStatus = finalPaidSoFar >= (doc.total - 0.01) ? "paid" : "pending";
          
          await doc.save();
       };
       
       for (const order of orders) await processDocument(order, PreOrder, false);
       for (const ds of directSales) await processDocument(ds, DirectSale, true);

    // Mark unlinked credit memos as completed/processed so they drop off the queue
      for (const cm of cms) {
        cm.paymentProcessed = true; 
        await cm.save();
      }
      return NextResponse.json({ success: true });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}