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

    let remainingAmount = Number(totalAmount) || 0;

    // Distribute payment across selected orders
    for (const order of orders) {
       // Get any linked credit memos for this specific order
       const orderCMs = await CreditMemo.find({ preorder: order._id, status: "received" });
       const creditTotal = orderCMs.reduce((sum, cm) => sum + cm.total, 0);

       // Calculate net for this order with the bulk discount
       let net = order.total - creditTotal;
       if (discountPercent > 0) {
         net = net - (net * (discountPercent / 100));
       }

       const paidSoFar = order.payments?.reduce((s: any, p: any) => s + p.amount, 0) || 0;
       const currentBalance = Math.max(net - paidSoFar, 0);

       // Apply payment if there is balance and we still have check funds
       if (currentBalance > 0 && remainingAmount > 0) {
          const paymentAmount = Math.min(currentBalance, remainingAmount);
          
          order.payments.push({
             type: method,
             amount: paymentAmount,
             checkNumber: method === "check" ? checkNumber : undefined
          });

          remainingAmount -= paymentAmount;
          
          const newTotalPaid = paidSoFar + paymentAmount;
          // Mark paid if the new total covers the net (accounting for minor float differences)
          order.paymentStatus = newTotalPaid >= (net - 0.01) ? "paid" : "pending";
          
          await order.save();

          if (order.paymentStatus === "paid"){
            await CreditMemo.updateMany({ preorder: order._id }, { $set: { paymentProcessed: true } });
          }
       }
    }

    // Distribute payment across selected orders
    for (const directSale of directSales) {
      // Get any linked credit memos for this specific directSale
      const directSaleCMs = await CreditMemo.find({ directSale: directSale._id, status: "received" });
      const creditTotal = directSaleCMs.reduce((sum, cm) => sum + cm.total, 0);

      // Calculate net for this order with the bulk discount
      let net = directSale.total - creditTotal;
      if (discountPercent > 0) {
        net = net - (net * (discountPercent / 100));
      }

      const paidSoFar = directSale.payments?.reduce((s: any, p: any) => s + p.amount, 0) || 0;
      const currentBalance = Math.max(net - paidSoFar, 0);

      // Apply payment if there is balance and we still have check funds
      if (currentBalance > 0 && remainingAmount > 0) {
         const paymentAmount = Math.min(currentBalance, remainingAmount);
         
         directSale.payments.push({
            type: method,
            amount: paymentAmount,
            checkNumber: method === "check" ? checkNumber : undefined
         });

         remainingAmount -= paymentAmount;
         
         const newTotalPaid = paidSoFar + paymentAmount;
         // Mark paid if the new total covers the net (accounting for minor float differences)
         directSale.paymentStatus = newTotalPaid >= (net - 0.01) ? "paid" : "pending";
         
         await directSale.save();

         if (directSale.paymentStatus === "paid") {
          await CreditMemo.updateMany({ directSale: directSale._id }, { $set: { paymentProcessed: true } });
         }
      }
   }

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