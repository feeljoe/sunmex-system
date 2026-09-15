import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { DateTime } from "luxon";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB not ready");

    const matchInvoices: any = { status: "delivered" };
    
    // Matcher for Standalone Credit Memos
    const matchStandaloneCMs: any = { 
        status: "received",
        preorder: null,
        directSale: null
    };

    if (fromDate && toDate) {
      const from = DateTime.fromISO(fromDate, { zone: "America/Phoenix" }).startOf("day").toUTC().toJSDate();
      const to = DateTime.fromISO(toDate, { zone: "America/Phoenix" }).endOf("day").toUTC().toJSDate();
      
      matchInvoices.deliveredAt = { $gte: from, $lte: to };
      matchStandaloneCMs.returnedAt = { $gte: from, $lte: to }; // CMs use returnedAt
    }

    // --------------------
    // PREORDERS PIPELINE
    // --------------------
    const preorderPipeline = [
      { $match: matchInvoices },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
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
          type: "preorder", // Tag it for the formatter
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

    // --------------------
    // DIRECT SALES PIPELINE
    // --------------------
    const directSalePipeline = [
      { $match: matchInvoices },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
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
          type: "directSale", // Tag it for the formatter
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

    // --------------------
    // STANDALONE CREDIT MEMOS PIPELINE
    // --------------------
    const standaloneCmPipeline = [
      { $match: matchStandaloneCMs },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          type: "standaloneCM", // Tag it for the formatter
          number: 1,
          clientName: "$clientData.clientName",
          chainName: "$chainData.name",
          returnedAt: 1, // CMs use returnedAt
          total: 1
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
      let invoiceTotal = 0;
      let cmTotal = 0;
      let balance = 0;
      let dateVal = r.deliveredAt;

      // Handle Standalone Credit Memos
      if (r.type === "standaloneCM") {
        cmTotal = Math.abs(r.total || 0);
        balance = -cmTotal; // Outputs as a negative balance to deduct from the whole sheet
        dateVal = r.returnedAt;
      } 
      // Handle Normal Invoices (Preorders & Direct Sales)
      else {
        cmTotal = r.linkedCms?.reduce((sum: number, cm: any) => sum + Math.abs(cm.total || 0), 0) || 0;
        invoiceTotal = Number(r.total || 0);
        balance = Math.max(invoiceTotal - cmTotal, 0);
      }

      const mappedObj: Record<string, any> = {
        "Invoice Number": r.number || "-",
        "Chain" : r.chainName?.toUpperCase() || "-",
        "Client Name": r.clientName?.toUpperCase() || "-",
        "Delivery Date": dateVal ? new Date(dateVal).toLocaleDateString() : "-",
        "Invoice Total": invoiceTotal.toFixed(2),
        "Credit Memo Total": cmTotal.toFixed(2),
        "Total Balance": balance.toFixed(2),
        "Payment Status": (r.paymentStatus || (r.type === "standaloneCM" ? "credit" : "pending")).toUpperCase()
      };

      return headersList.map(h => `"${String(mappedObj[h] ?? "").replace(/"/g, '""')}"`).join(",");
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(headers.map(h => `"${h}"`).join(",") + "\n"));

        // 1. Stream Preorders
        const poCursor = db.collection("preorders").aggregate(preorderPipeline);
        for await (const doc of poCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }

        // 2. Stream Direct Sales
        const dsCursor = db.collection("directsales").aggregate(directSalePipeline);
        for await (const doc of dsCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }

        // 3. Stream Standalone Credit Memos
        const cmCursor = db.collection("creditmemos").aggregate(standaloneCmPipeline);
        for await (const doc of cmCursor) {
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