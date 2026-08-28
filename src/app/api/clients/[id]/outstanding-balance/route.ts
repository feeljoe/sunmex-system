import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Client from "@/models/Client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

export async function GET(req: Request, context: { params: Promise<{ id: string }>}) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    
    // Fetch the client and populate their payment term to get dueDays
    const client = await Client.findById(id).populate("paymentTerm");
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const dueDays = client.paymentTerm?.dueDays || 0;
    const now = DateTime.now().setZone("America/Phoenix");

    // Look for past preorders matching the rules
    const preorders = await PreOrder.find({
      client: id,
      status: "delivered",
      paymentStatus: "pending"
    });

    let outstandingTotal = 0;
    const outstandingInvoices: string[] = [];

    preorders.forEach((po) => {
      if (!po.deliveredAt) return;
      
      const deliveredDate = DateTime.fromJSDate(po.deliveredAt).setZone("America/Phoenix");
      
      // Calculate how many days have passed since delivery
      const diffInDays = now.diff(deliveredDate, 'days').days;

      // Rule: If dueDays === 0, it's instantly owed. 
      // If dueDays > 0, the difference must be greater than dueDays to be an actual balance.
      if (dueDays === 0 || diffInDays > dueDays) {
        
        // Calculate the true remaining balance of this invoice just to be safe
        const paidSoFar = po.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const balance = po.total - paidSoFar;
        
        if (balance > 0.01) {
          outstandingTotal += balance;
          outstandingInvoices.push(po.number);
        }
      }
    });

    return NextResponse.json({
      hasBalance: outstandingTotal > 0,
      total: outstandingTotal,
      invoices: outstandingInvoices
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}