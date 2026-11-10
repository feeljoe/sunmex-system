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
      {
        $addFields: {
          resolvedInventoryModel: {
            $ifNull: [
              "$products.inventoryModel",
              "ProductInventory"
            ]
          }
        }
      },
      { $lookup: { from: "productinventories", localField: "products.productInventory", foreignField: "_id", as: "mainInventoryData" } },
      { $lookup: { from: "foreigninventories", localField: "products.productInventory", foreignField: "_id", as: "foreignInventoryData"}},
      {
        $addFields: {
          inventoryData: {
            $cond: {
              if: {
                $eq: [
                  "$resolvedInventoryModel",
                  "ForeignInventory"
                ]
              },
              then: {
                $arrayElemAt: ["$foreignInventoryData", 0]
              },
              else: {
                $arrayElemAt: ["$mainInventoryData", 0]
              }
            }
          }
        }
      },
      { $unwind: {
          path: "$inventoryData",
          preserveNullAndEmptyArrays: true
        }
      },
      { $lookup: { from: "products", localField: "inventoryData.product", foreignField: "_id", as: "productData"}},
      { $unwind: {
          path: "$productData",
          preserveNullAndEmptyArrays: true,
        }
      },
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
          inventoryLocation: {
            $ifNull: ["$inventoryLocation", "phoenix"]
          },
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
          costAllocations: {
            $ifNull: ["$products.lotAllocations", []]
          },
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
      { $lookup: { from: "users", localField: "vendorRouteData.user", foreignField: "_id", as: "routeUserData"}},
      { $unwind: { path: "$routeUserData", preserveNullAndEmptyArrays: true }},
      {
        $project: {
          type: "directSale",
          invoiceType: "charge",
          invoiceTotal: "$total",
          number: 1,
          inventoryLocation: {
            $ifNull: [
              "$inventoryLocation",
              {
                $ifNull: [
                  "$routeUserData.location",
                  "phoenix"
                ]
              }
            ]
          },
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
          costAllocations: {
            $ifNull: ["$products.lotAllocations", []]
          },
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
          inventoryLocation: {
            $ifNull: ["$inventoryLocation", "phoenix"],
          },
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
          costAllocations: {
            $ifNull: ["$products.lotAllocations", []]
          },
          price: { $ifNull: ["$products.actualCost", "$products.unitPrice"] }, 
          charge: { $literal: 0 },
          noCharge: { $literal: 0 },
          creditMemo: { $cond: [{ $eq: ["$products.returnReason", "credit memo"] }, "$products.returnedQuantity", 0] },
          goodReturn: { $cond: [{ $eq: ["$products.returnReason", "good return"] }, "$products.returnedQuantity", 0] },
        },
      },
    ];

    type CostAllocation = {
      quantity?: number | null;
      unitCost?: number | null;
    };
    const calculateLotBasedCost = (quantity: number, productUnitCost: number, allocations: CostAllocation[] = []): number => {
      const totalQty = Math.max(0, Math.abs(Number(quantity) || 0));
      const fallbackCost = Number(productUnitCost) || 0;
      if(totalQty === 0) return 0;
      const validAllocations = (Array.isArray(allocations) ? allocations : [])
        .filter((lot) => lot != null && lot.unitCost != null && lot.unitCost !== ("" as any) && Number.isFinite(Number(lot.unitCost)) && Number(lot.unitCost) >= 0);
      
      if(validAllocations.length === 0) {
        return totalQty * fallbackCost;
      }
      const quantityAllocations = validAllocations.filter((lot) => lot.quantity != null && Number.isFinite(Number(lot.quantity)) && Number(lot.quantity) > 0);
      if(validAllocations.length === 1 && quantityAllocations.length === 0) {
        return totalQty * Number(validAllocations[0].unitCost);
      }
      const allocatedQty = quantityAllocations.reduce((sum, lot) => sum + Number(lot.quantity), 0);
      if(allocatedQty > totalQty + 0.000001){
        return totalQty * fallbackCost;
      }
      const lotCostTotal = quantityAllocations.reduce((sum, lot) => sum + Number(lot.quantity) * Number(lot.unitCost), 0);
      const remainingQty = Math.max(0, totalQty - allocatedQty);
      return lotCostTotal + remainingQty * fallbackCost;
    }

    const formatRowToCSV = (r: any, headers: string[]) => {
      const isNoCharge = r.invoiceType === "noCharge";
      const isCredit = r.type === "creditMemo";
      
      // Keep everything as safe absolute numbers for the math
      const delQty = Math.abs(r.deliveredQty || 0);
      const cost = Number(r.cost) || 0;
      const price = Number(r.price) || 0;

      const calculatedCost = calculateLotBasedCost(delQty, cost, r.costAllocations || []);
      const calculatedPrice = delQty * price;
      // Explicit Routing logic
      let saleCostTotal = 0;
      let salePriceTotal = 0;
      let creditMemoCostTotal = 0;
      let creditMemoPriceTotal = 0;
      let goodReturnCostTotal = 0;
      let goodReturnPriceTotal = 0;

      if (isCredit) {
        const creditMemoQty = Number(r.creditMemo) || 0;
        const goodReturnQty = Number(r.goodReturn) || 0;
        if(creditMemoQty > 0) {
          creditMemoCostTotal = calculateLotBasedCost(creditMemoQty, cost, r.costAllocations || []);
          creditMemoPriceTotal = creditMemoQty * price;
        }
        if(goodReturnQty > 0) {
          goodReturnCostTotal = calculateLotBasedCost(goodReturnQty, cost, r.costAllocations || []);
          goodReturnPriceTotal = goodReturnQty * price;
        }
      } else {
        saleCostTotal = calculatedCost;
        if (!isNoCharge) {
          // It's a normal sale! Put the dollars in the revenue buckets.
          salePriceTotal = calculatedPrice;
        }
      }

      const profit = isCredit || isNoCharge ? 0 : salePriceTotal - saleCostTotal;
      const margin = !isCredit && !isNoCharge && salePriceTotal > 0 ? profit / salePriceTotal : 0;

      const mappedObj = {
        "Number": r.number || "",
        "Invoice Type": r.invoiceType?.toUpperCase() || "",
        "InventoryLocation": r.inventoryLocation || "phoenix",
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
        "Sale Cost Total": saleCostTotal,
        "Sale Price Total": salePriceTotal,
        "Credit Memo Cost Total": creditMemoCostTotal,
        "Credit Memo Price Total": creditMemoPriceTotal,
        "Good Return Cost Total": goodReturnCostTotal,
        "Good Return Price Total": goodReturnPriceTotal,
        "Commission Sales": salePriceTotal - creditMemoPriceTotal - goodReturnPriceTotal,
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
      "Number", "Invoice Type", "InventoryLocation", "Chain", "Client #", "Client Name", "Vendor Route", "Vendor Name",
      "Driver Route", "Driver Name", "Warehouse", "Created At", "Created Day", "Created Month", 
      "Created Year", "Assembled At", "Assembled Day", "Assembled Month", "Assembled Year", 
      "Delivered/Received At", "Delivered Day", "Delivered Month", "Delivered Year", "SKU", 
      "Brand", "Product", "Category", "Original Qty", "Assembled Qty", "Delivered Qty", "Cost", "Price", 
      "Sale Cost Total", "Sale Price Total", "Credit Memo Cost Total", "Credit Memo Price Total", "Good Return Cost Total", 
      "Good Return Price Total", "Commission Sales", "Margin", "Profit", 
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