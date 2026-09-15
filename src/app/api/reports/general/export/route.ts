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

    const matchPreorders: any = { status: "delivered" };
    const matchDirectSales: any = { status: "delivered" };
    const matchCreditMemos: any = { status: "received" };

    if (fromDate && toDate) {
      const from = DateTime.fromISO(fromDate, { zone: "America/Phoenix" }).startOf("day").toUTC().toJSDate();
      const to = DateTime.fromISO(toDate, { zone: "America/Phoenix" }).endOf("day").toUTC().toJSDate();

      matchPreorders.deliveredAt = { $gte: from, $lte: to };
      matchDirectSales.deliveredAt = { $gte: from, $lte: to };
      matchCreditMemos.returnedAt = { $gte: from, $lte: to };
    }

    // --------------------
    // PREORDERS PIPELINE
    // --------------------
    const preorderPipeline = [
      { $match: matchPreorders },
      { $unwind: "$products" },
      { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "inventoryData" } },
      { $unwind: "$inventoryData" },
      { $lookup: { from: "products", localField: "inventoryData.product", foreignField: "_id", as: "productData" } },
      { $unwind: "$productData" },
      { $lookup: { from: "brands", localField: "productData.brand", foreignField: "_id", as: "brandData" } },
      { $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "types", localField: "productData.productType", foreignField: "_id", as: "typeData" } },
      { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: "$clientData" },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "vendorData" } },
      { $unwind: "$vendorData" },
      { $lookup: { from: "routes", localField: "createdBy", foreignField: "user", as: "vendorRouteData" } },
      { $unwind: { path: "$vendorRouteData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "routes", localField: "routeAssigned", foreignField: "_id", as: "driverRouteData" } },
      { $unwind: { path: "$driverRouteData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "driverRouteData.user", foreignField: "_id", as: "driverUserData" } },
      { $unwind: { path: "$driverUserData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "assembledBy", foreignField: "_id", as: "warehouseData" } },
      { $unwind: { path: "$warehouseData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          type: "preorder",
          invoiceType: "$type",
          invoiceTotal: "$total",
          number: 1,
          chain: "$chainData.name",
          clientNumber: "$clientData.clientNumber",
          clientName: "$clientData.clientName",
          vendorName: { $concat: ["$vendorData.firstName", " ", "$vendorData.lastName"] },
          vendorRoute: "$vendorRouteData.code",
          driverName: { $concat: ["$driverUserData.firstName", " ", "$driverUserData.lastName"] },
          driverRoute: "$driverRouteData.code",
          warehouseName: { $concat: ["$warehouseData.firstName", " ", "$warehouseData.lastName"] },
          createdAt: 1,
          createdDay: { $dayOfMonth: "$createdAt" },
          createdMonth: { $month: "$createdAt" },
          createdYear: { $year: "$createdAt" },
          assembledAt: 1,
          assembledDay: { $dayOfMonth: "$assembledAt" },
          assembledMonth: { $month: "$assembledAt" },
          assembledYear: { $year: "$assembledAt" },
          deliveredAt: 1,
          deliveredDay: { $dayOfMonth: "$deliveredAt" },
          deliveredMonth: { $month: "$deliveredAt" },
          deliveredYear: { $year: "$deliveredAt" },
          productSku: "$productData.sku",
          brand: "$brandData.name",
          productName: "$productData.name",
          typeName: "$typeData.name",
          originalQty: "$products.quantity",
          assembledQty: "$products.pickedQuantity",
          deliveredQty: "$products.deliveredQuantity",
          cost: "$productData.unitCost",
          price: { $ifNull: ["$products.actualCost", "$products.unitPrice"] }, // 🔥 FIX: Safe fallback
          charge: { $cond: [{ $eq: ["$type", "charge"] }, "$products.deliveredQuantity", 0] },
          noCharge: { $cond: [{ $eq: ["$type", "noCharge"] }, "$products.deliveredQuantity", 0] },
          creditMemo: { $literal: 0 },
          goodReturn: { $literal: 0 },
        },
      },
    ];

    // --------------------
    // DIRECT-SALES PIPELINE
    // --------------------
    const directSalePipeline = [
      { $match: matchDirectSales },
      { $unwind: "$products" },
      { $lookup: { from: "products", localField: "products.product", foreignField: "_id", as: "productData" } },
      { $unwind: "$productData" },
      { $lookup: { from: "brands", localField: "productData.brand", foreignField: "_id", as: "brandData" } },
      { $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "types", localField: "productData.productType", foreignField: "_id", as: "typeData" } },
      { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: "$clientData" },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "vendorData" } },
      { $unwind: "$vendorData" },
      { $lookup: { from: "routes", localField: "route", foreignField: "_id", as: "vendorRouteData" } },
      { $unwind: { path: "$vendorRouteData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          type: "directSale",
          invoiceType: "charge",
          invoiceTotal: "$total",
          number: 1,
          chain: "$chainData.name",
          clientNumber: "$clientData.clientNumber",
          clientName: "$clientData.clientName",
          vendorName: { $concat: ["$vendorData.firstName", " ", "$vendorData.lastName"] },
          vendorRoute: "$vendorRouteData.code",
          createdAt: 1,
          createdDay: { $dayOfMonth: "$createdAt" },
          createdMonth: { $month: "$createdAt" },
          createdYear: { $year: "$createdAt" },
          deliveredAt: 1,
          deliveredDay: { $dayOfMonth: "$deliveredAt" },
          deliveredMonth: { $month: "$deliveredAt" },
          deliveredYear: { $year: "$deliveredAt" },
          productSku: "$productData.sku",
          brand: "$brandData.name",
          productName: "$productData.name",
          typeName: "$typeData.name",
          originalQty: "$products.quantity",
          assembledQty: "$products.quantity",
          deliveredQty: "$products.quantity",
          cost: "$productData.unitCost",
          price: { $ifNull: ["$products.actualCost", "$products.unitPrice"] }, // 🔥 FIX: Safe fallback
          charge: "$products.quantity",
          noCharge: { $literal: 0 },
          creditMemo: { $literal: 0 },
          goodReturn: { $literal: 0 },
        },
      },
    ];

    // --------------------
    // CREDIT MEMOS PIPELINE
    // --------------------
    const creditMemoPipeline = [
      { $match: matchCreditMemos },
      { $unwind: "$products" },
      { $lookup: { from: "products", localField: "products.product", foreignField: "_id", as: "productData" } },
      { $unwind: "$productData" },
      { $lookup: { from: "brands", localField: "productData.brand", foreignField: "_id", as: "brandData" } },
      { $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "types", localField: "productData.productType", foreignField: "_id", as: "typeData" } },
      { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "clientData" } },
      { $unwind: "$clientData" },
      { $lookup: { from: "chains", localField: "clientData.chain", foreignField: "_id", as: "chainData" } },
      { $unwind: { path: "$chainData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "vendorData" } },
      { $unwind: "$vendorData" },
      { $lookup: { from: "routes", localField: "createdBy", foreignField: "user", as: "vendorRouteData" } },
      { $unwind: { path: "$vendorRouteData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "routes", localField: "routeAssigned", foreignField: "_id", as: "driverRouteData" } },
      { $unwind: { path: "$driverRouteData", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "driverRouteData.user", foreignField: "_id", as: "driverUserData" } },
      { $unwind: { path: "$driverUserData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          type: "creditMemo",
          invoiceType: "credit",
          invoiceTotal: "$total",
          number: 1,
          chain: "$chainData.name",
          clientNumber: "$clientData.clientNumber",
          clientName: "$clientData.clientName",
          vendorName: { $concat: ["$vendorData.firstName", " ", "$vendorData.lastName"] },
          vendorRoute: "$vendorRouteData.code",
          driverName: { $concat: ["$driverUserData.firstName", " ", "$driverUserData.lastName"] },
          driverRoute: "$driverRouteData.code",
          warehouseName: "",
          createdAt: 1,
          createdDay: { $dayOfMonth: "$createdAt" },
          createdMonth: { $month: "$createdAt" },
          createdYear: { $year: "$createdAt" },
          receivedAt: "$returnedAt",
          receivedDay: { $dayOfMonth: "$returnedAt" },
          receivedMonth: { $month: "$returnedAt" },
          receivedYear: { $year: "$returnedAt" },
          productSku: "$productData.sku",
          brand: "$brandData.name",
          productName: "$productData.name",
          typeName: "$typeData.name",
          originalQty: "$products.quantity",
          assembledQty: "$products.quantity",
          deliveredQty: "$products.returnedQuantity",
          cost: "$productData.unitCost",
          price: { $ifNull: ["$products.actualCost", "$products.unitPrice"] }, 
          charge: { $literal: 0 },
          noCharge: { $literal: 0 },
          creditMemo: { $cond: [{ $eq: ["$products.returnReason", "credit memo"] }, "$products.returnedQuantity", 0] },
          goodReturn: { $cond: [{ $eq: ["$products.returnReason", "good return"] }, "$products.returnedQuantity", 0] },
        },
      },
    ];

    const formatRowToCSV = (r: any, headers: string[]) => {
      const isNoCharge = r.invoiceType === "noCharge";
      const isCredit = r.type === "creditMemo";
      
      // Keep everything as safe absolute numbers for the math
      const delQty = Math.abs(r.deliveredQty || 0);
      const cost = r.cost || 0;
      const price = r.price || 0;

      // Base line-item math
      const rowCostVal = delQty * cost;
      const rowSaleVal = delQty * price;

      // Explicit Routing logic
      let rowCostTotal = 0;
      let rowSaleTotal = 0;
      let rowCreditTotal = 0;

      if (isCredit) {
        // It's a credit memo! Put the dollars in the credit bucket.
        rowCreditTotal = rowSaleVal;
      } else if (!isNoCharge) {
        // It's a normal sale! Put the dollars in the revenue buckets.
        rowCostTotal = rowCostVal;
        rowSaleTotal = rowSaleVal;
      }
      // If it IS noCharge, everything safely remains 0!

      // Margin & Profit based strictly on the routed buckets
      const margin = rowSaleTotal > 0 ? (rowSaleTotal - rowCostTotal) / rowSaleTotal : 0;
      const profit = rowSaleTotal - rowCostTotal;

      const mappedObj = {
        "Number": r.number || "",
        "Invoice Type": r.invoiceType?.toUpperCase() || "",
        "Chain": r.chain || "",
        "Client #": r.clientNumber || "",
        "Client Name": r.clientName || "",
        "Vendor Route": r.vendorRoute || "",
        "Vendor Name": r.vendorName || "",
        "Driver Route": r.driverRoute || "",
        "Driver Name": r.driverName || "",
        "Warehouse": r.warehouseName || "",
        "Created At": r.createdAt || "",
        "Created Day": r.createdDay || "",
        "Created Month": r.createdMonth || "",
        "Created Year": r.createdYear || "",
        "Assembled At": r.assembledAt || "",
        "Assembled Day": r.assembledDay || "",
        "Assembled Month": r.assembledMonth || "",
        "Assembled Year": r.assembledYear || "",
        "Delivered/Received At": r.deliveredAt || r.receivedAt || "",
        "Delivered Day": r.deliveredDay || r.receivedDay || "",
        "Delivered Month": r.deliveredMonth || r.receivedMonth || "",
        "Delivered Year": r.deliveredYear || r.receivedYear || "",
        "SKU": r.productSku || "",
        "Brand": r.brand || "",
        "Product": r.productName || "",
        "Category": r.typeName || "",
        "Original Qty": r.originalQty || 0,
        "Assembled Qty": r.assembledQty || 0,
        "Delivered Qty": delQty,
        "Cost": cost,
        "Price": price,
        "Cost Total": rowCostTotal,
        "Sale Total": rowSaleTotal,
        "Credit Total": rowCreditTotal,
        "Margin": margin,
        "Profit": profit,
        "Charge Units": r.charge || 0,
        "No Charge Units": r.noCharge || 0,
        "Credit Memo Units": r.creditMemo || 0,
        "Good Return Units": r.goodReturn || 0,
      };
      return headers.map(h => `"${String((mappedObj as any)[h] ?? "").replace(/"/g, '""')}"`).join(",");
    };

    const headers = [
      "Number", "Invoice Type", "Chain", "Client #", "Client Name", "Vendor Route", "Vendor Name",
      "Driver Route", "Driver Name", "Warehouse", "Created At", "Created Day", "Created Month", 
      "Created Year", "Assembled At", "Assembled Day", "Assembled Month", "Assembled Year", 
      "Delivered/Received At", "Delivered Day", "Delivered Month", "Delivered Year", "SKU", 
      "Brand", "Product", "Category", "Original Qty", "Assembled Qty", "Delivered Qty", "Cost", "Price", 
      "Cost Total", "Sale Total", "Credit Total", "Margin", "Profit", 
      "Charge Units", "No Charge Units", "Credit Memo Units", "Good Return Units"
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(headers.map(h => `"${h}"`).join(",") + "\n"));

        const poCursor = db.collection("preorders").aggregate(preorderPipeline);
        for await (const doc of poCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }
        const dsCursor = db.collection("directsales").aggregate(directSalePipeline);
        for await (const doc of dsCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }
        const cmCursor = db.collection("creditmemos").aggregate(creditMemoPipeline);
        for await (const doc of cmCursor) {
          controller.enqueue(encoder.encode(formatRowToCSV(doc, headers) + "\n"));
        }

        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Disposition": 'attachment; filename="general-report-detailed.csv"',
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err: any) {
    return Response.json({error: err || "Export failed"}, {status: 500});
  }
}