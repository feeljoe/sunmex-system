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
    
    // This is the global pool of credits the user explicitly selected in the UI
    let remainingUnlinkedCredit = cms.reduce((sum, cm) => sum + Math.abs(cm.total), 0);

    const processDocument = async (doc: any, Model: any, isDirectSale = false) => {
      const query = isDirectSale ? { directSale: doc._id, status: "received", paymentProcessed: { $ne: true } }: { preorder: doc._id, status: "received", paymentProcessed: {$ne: true} };
      const linkedCMs = await CreditMemo.find(query);

      for (const cm of linkedCMs) {
        // 1. Always apply the linked CM to its parent document
        doc.payments.push({ type: "creditMemo", amount: Math.abs(cm.total) });
        cm.paymentProcessed = true;
        await cm.save();

        // 2. PREVENT DOUBLE DIPPING: 
        // If this CM was also manually selected in the UI, it is currently sitting inside 'remainingUnlinkedCredit'.
        // We must deduct it from the global pool so we don't apply it again in Step 4!
        const isSelectedInUI = cms.some(globalCm => globalCm._id.toString() === cm._id.toString());
        if (isSelectedInUI) {
            remainingUnlinkedCredit = Math.max(0, remainingUnlinkedCredit - Math.abs(cm.total));
        }
      }

      // 3. Apply Discount
      if (discountPercent > 0) {
        const discountAmount = doc.total * (discountPercent/100);
        doc.payments.push({type: "discount", amount: discountAmount});
      }
    
       const paidSoFar = doc.payments?.reduce((s: any, p: any) => s + p.amount, 0);
       let currentBalance = Math.max(doc.total - paidSoFar, 0);

       // 4. Apply Unlinked / Global Credits
       if (currentBalance > 0 && remainingUnlinkedCredit > 0) {
        const applyCredit = Math.min(currentBalance, remainingUnlinkedCredit);
        doc.payments.push({ type: "creditMemo", amount: applyCredit });
        remainingUnlinkedCredit -= applyCredit;
        currentBalance -= applyCredit;
       }

       // 5. Apply Cash/Check
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

    for (const cm of cms) {
      cm.paymentProcessed = true; 
      await cm.save();
    }
    return NextResponse.json({ success: true });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}