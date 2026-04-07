import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const searchParams = req.nextUrl.searchParams;

  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const db = mongoose.connection.db;
  if (!db) throw new Error("DB not ready");

  const matchPreorders: any = { status: "delivered" };
  const matchCreditMemos: any = { status: "received" };

  const parseLocalDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00");
  
  if (fromDate && toDate) {
    const from = parseLocalDate(fromDate);
    const to = parseLocalDate(toDate);
  
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  
    matchPreorders.deliveredAt = { $gte: from, $lte: to };
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
        price: "$products.actualCost",
        charge: { $cond: [{ $eq: ["$type", "charge"] }, "$products.deliveredQuantity", 0] },
        noCharge: { $cond: [{ $eq: ["$type", "noCharge"] }, "$products.deliveredQuantity", 0] },
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
        deliveredQty: { $multiply: ["$products.returnedQuantity", -1] },
        cost: "$productData.unitCost",
        price: "$products.actualCost",
        charge: { $literal: 0},
        noCharge: { $literal: 0},
        creditMemo: { $cond: [{ $eq: ["$products.returnReason", "credit memo"] }, { $multiply: ["$products.returnedQuantity", -1] }, 0] },
        goodReturn: { $cond: [{ $eq: ["$products.returnReason", "good return"] }, { $multiply: ["$products.returnedQuantity", -1] }, 0] },
      },
    },
  ];

  const [preorders, creditMemos] = await Promise.all([
    db.collection("preorders").aggregate(preorderPipeline).toArray(),
    db.collection("creditmemos").aggregate(creditMemoPipeline).toArray(),
  ]);

  const rows = [...preorders, ...creditMemos].map((r) => ({
    Number: r.number || "",
    Chain: r.chain || "",
    "Client #": r.clientNumber || "",
    "Client Name": r.clientName || "",
    "Vendor Route": r.vendorRoute || "",
    "Vendor Name": r.vendorName || "",
    "Driver Route": r.driverRoute || "",
    "Driver Name": r.driverName || "",
    Warehouse: r.warehouseName || "",
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
    SKU: r.productSku || "",
    Brand: r.brand || "",
    Product: r.productName || "",
    Type: r.typeName || "",
    "Original Qty": r.originalQty || 0,
    "Assembled Qty": r.assembledQty || 0,
    "Delivered Qty": r.deliveredQty || 0,
    Cost: r.cost || 0,
    Price: r.price || 0,
    "Sale Total": r.deliveredQty > 0 ? (r.deliveredQty || 0) * (r.price || 0) : 0,
    "Credit Total": r.deliveredQty < 0 ? (r.deliveredQty || 0) * (r.price || 0): 0,
    Margin: r.price > 0 ? ((r.price || 0) - (r.cost || 0))/r.price : "Margin could not be calculated",
    Profit: ((r.deliveredQty || 0) * (r.price || 0)) * (r.price > 0 ? ((r.price || 0) - (r.cost || 0))/r.price : 0),
    Charge: r.charge || 0,
    "No Charge": r.noCharge || 0,
    "Credit Memo": r.creditMemo || 0,
    "Good Return": r.goodReturn || 0,
  }));
  console.log("Rows length: ", rows.length);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "General Report");

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });
  
  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": 'attachment; filename="general-report.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}