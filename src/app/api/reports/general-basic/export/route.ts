import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB not ready");

    // Only pull delivered invoices
    const matchInvoices: any = { status: "delivered" };

    const parseLocalDate = (dateStr: string) => new Date(dateStr + "T00:00:00");
    
    if (fromDate && toDate) {
      const from = parseLocalDate(fromDate);
      const to = parseLocalDate(toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      matchInvoices.deliveredAt = { $gte: from, $lte: to };
    }

    // --------------------
    // PREORDERS PIPELINE
    // --------------------
    const preorderPipeline = [
      { $match: matchInvoices },
      // Get the Client Name
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      // Find all Credit Memos linked to this PreOrder ID
      { $lookup: {
          from: "creditmemos",
          let: { invoiceId: "$_id" },
          pipeline: [
            { $match: { 
                $expr: { 
                  $and: [
                    { $eq: ["$status", "received"] },
                    { $eq: ["$preorder", "$$invoiceId"] }
                  ]
                } 
            }}
          ],
          as: "linkedCms"
      }},
      {
        $project: {
          number: 1,
          clientName: "$clientData.clientName",
          chainName: "$chainData.name",
          deliveredAt: 1,
          total: 1,
          paymentStatus: 1,
          linkedCms: 1 // We pass the raw array of CMs to calculate safely in JavaScript
        }
      }
    ];

    // --------------------
    // DIRECT SALES PIPELINE
    // --------------------
    const directSalePipeline = [
      { $match: matchInvoices },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      
      // Find all Credit Memos linked to this Direct Sale ID
      { $lookup: {
          from: "creditmemos",
          let: { invoiceId: "$_id" },
          pipeline: [
            { $match: { 
                $expr: { 
                  $and: [
                    { $eq: ["$status", "received"] },
                    { $eq: ["$directSale", "$$invoiceId"] }
                  ]
                } 
            }}
          ],
          as: "linkedCms"
      }},
      {
        $project: {
          number: 1,
          clientName: "$clientData.clientName",
          chainName: "$chainData.name",
          deliveredAt: 1,
          total: 1,
          paymentStatus: 1,
          linkedCms: 1
        }
      }
    ];

    const headers = [
      "Invoice Number", 
      "Chain",
      "Client Name", 
      "Delivery Date", 
      "Invoice Total", 
      "Credit Memo Total", 
      "Total Balance", 
      "Payment Status"
    ];

    const formatRowToCSV = (r: any, headersList: string[]) => {
      // Safely sum up the total of all attached credit memos (ensuring we treat them as positive deductions)
      const cmTotal = r.linkedCms?.reduce((sum: number, cm: any) => sum + Math.abs(cm.total || 0), 0) || 0;
      const invoiceTotal = Number(r.total || 0);
      const balance = Math.max(invoiceTotal - cmTotal, 0);

      const mappedObj: Record<string, any> = {
        "Invoice Number": r.number || "-",
        "Chain" : r.chainName?.toUpperCase() || "-",
        "Client Name": r.clientName?.toUpperCase() || "-",
        "Delivery Date": r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString() : "-",
        "Invoice Total": invoiceTotal.toFixed(2),
        "Credit Memo Total": cmTotal.toFixed(2),
        "Total Balance": balance.toFixed(2),
        "Payment Status": (r.paymentStatus || "pending").toUpperCase()
      };

      return headersList.map(h => `"${String(mappedObj[h] ?? "").replace(/"/g, '""')}"`).join(",");
    };

    // THE STREAMING ENGINE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue the headers (with the correctly closed quotes!)
        controller.enqueue(encoder.encode(headers.map(h => `"${h}"`).join(",") + "\n"));

        // Stream PreOrders
        const poCursor = db.collection("preorders").aggregate(preorderPipeline);
        for await (const doc of poCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }

        // Stream Direct Sales
        const dsCursor = db.collection("directsales").aggregate(directSalePipeline);
        for await (const doc of dsCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }

        controller.close();
      }
    });

    const prefix = "invoice-credits-report";
    let fileName = `${prefix}.csv`;
    if (fromDate && toDate) {
        fileName = fromDate === toDate ? `${prefix}-${fromDate}.csv` : `${prefix}-${fromDate}-to-${toDate}.csv`;
    }

    return new NextResponse(stream, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });

  } catch (err: any) {
    console.error("Export Error:", err);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}