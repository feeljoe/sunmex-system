import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  await connectToDatabase();
  try {
    const { orderIds, dsIds, cmIds, method, checkNumber, totalAmount, discountPercent = 0 } = await req.json();

    // Populate the "client" so we can access the .chain property
    const orders = await PreOrder.find({ _id: { $in: orderIds } }).populate("client");
    const directSales = await DirectSale.find({ _id: { $in: dsIds } }).populate("client");
    const cms = await CreditMemo.find({ _id: { $in: cmIds } }).populate("client");

    let remainingCash = Number(totalAmount) || 0;
    
    // Group Credits by Chain (if it exists), otherwise isolate by Client ID
    const creditPool: Record<string, number> = {};
    for (const cm of cms) {
        const poolKey = cm.client.chain ? cm.client.chain.toString() : cm.client._id.toString();
        creditPool[poolKey] = (creditPool[poolKey] || 0) + Math.abs(cm.total);
    }

    const processDocument = async (doc: any, Model: any, isDirectSale = false) => {
      const query = isDirectSale ? { directSale: doc._id, status: "received", paymentProcessed: { $ne: true } }: { preorder: doc._id, status: "received", paymentProcessed: {$ne: true} };
      const linkedCMs = await CreditMemo.find(query);
      
      // Determine this document's pool key (Chain or Client ID)
      const poolKey = doc.client.chain ? doc.client.chain.toString() : doc.client._id.toString();

      for (const cm of linkedCMs) {
        doc.payments.push({ type: "creditMemo", amount: Math.abs(cm.total) });
        cm.paymentProcessed = true;
        await cm.save();

        const isSelectedInUI = cms.some(globalCm => globalCm._id.toString() === cm._id.toString());
        if (isSelectedInUI && creditPool[poolKey]) {
            creditPool[poolKey] = Math.max(0, creditPool[poolKey] - Math.abs(cm.total));
        }
      }

      if (discountPercent > 0) {
        const discountAmount = doc.total * (discountPercent/100);
        doc.payments.push({type: "discount", amount: discountAmount});
      }
    
       const paidSoFar = doc.payments?.reduce((s: any, p: any) => s + p.amount, 0);
       let currentBalance = Math.max(doc.total - paidSoFar, 0);

       // 4. Apply Unlinked Credits from this Chain/Client's specific pool!
       if (currentBalance > 0 && creditPool[poolKey] > 0) {
        const applyCredit = Math.min(currentBalance, creditPool[poolKey]);
        doc.payments.push({ type: "creditMemo", amount: applyCredit }); 
        creditPool[poolKey] -= applyCredit;
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