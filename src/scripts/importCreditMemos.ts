import * as dotenv from "dotenv";
dotenv.config();

import * as xlsx from "xlsx";
import { join } from "path";
import mongoose from "mongoose";

import { connectToDatabase } from "../lib/db";
import CreditMemo from "../models/CreditMemo";
import Client from "../models/Client";
import Product from "../models/Product";
import Route from "../models/Route";

const FALLBACK_USER_ID = new mongoose.Types.ObjectId("696465f161f2df04e4abaa75");

type ExcelRow = {
  number: string;
  sku: string;
  clientNumber: string;
  routeVendor: string;
  routeDriver: string;
  returnedAt: number | string | Date;
  actualCost: number;
  creditMemo?: number;
  goodReturn?: number;
  noCost?: number;
};

function parseExcelDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  return new Date(value);
}

export async function importCreditMemos() {
  await connectToDatabase();

  const projectRoot = join(__dirname, "../../");
  const excelPath = join(projectRoot, "src/scripts/CreditMemos.xlsx");

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[1]];
  const rows = xlsx.utils.sheet_to_json<ExcelRow>(sheet);

  // 🔹 Group rows by credit memo number
  const grouped = new Map<string, ExcelRow[]>();
  for (const row of rows) {
    if (!grouped.has(row.number)) grouped.set(row.number, []);
    grouped.get(row.number)!.push(row);
  }

  let created = 0;
  let skipped = 0;

  for (const [memoNumber, group] of Array.from(grouped.entries())) {
    const first = group[0];

    const client = await Client.findOne({ clientNumber: first.clientNumber });
    if (!client) {
      console.warn(`❌ Client not found: ${first.clientNumber}`);
      skipped++;
      continue;
    }

    const returnedAt = parseExcelDate(first.returnedAt);
    if (isNaN(returnedAt.getTime())) {
      console.warn(`❌ Invalid returnedAt date for credit memo ${memoNumber}`);
      skipped++;
      continue;
    }

    // 🔹 Resolve createdBy
    let createdBy = FALLBACK_USER_ID;
    if (first.routeVendor !== "001") {
      const vendorRoute = await Route.findOne({ code: first.routeVendor });
      if (vendorRoute?.user) createdBy = vendorRoute.user;
    }

    // 🔹 Resolve routeAssigned
    let routeAssigned: mongoose.Types.ObjectId | undefined;
    if (first.routeDriver !== "001") {
      const driverRoute = await Route.findOne({ code: first.routeDriver });
      if (driverRoute) routeAssigned = driverRoute._id;
    }

    const products: any[] = [];
    let subtotal = 0;

    for (const row of group) {
      const product = await Product.findOne({ sku: row.sku });
      if (!product) {
        console.warn(`❌ Product not found: ${row.sku} (CreditMemo ${memoNumber})`);
        continue;
      }

      let quantity = 0;
      let returnReason: "credit memo" | "good return" | "no cost" | undefined;

      if (Number(row.creditMemo) > 0) {
        quantity = Number(row.creditMemo);
        returnReason = "credit memo";
      } else if (Number(row.goodReturn) > 0) {
        quantity = Number(row.goodReturn);
        returnReason = "good return";
      } else if (Number(row.noCost) > 0) {
        quantity = Number(row.noCost);
        returnReason = "no cost";
      } else {
        continue; // nothing to return on this row
      }

      const cost = Number(row.actualCost);
      subtotal += quantity * cost;

      products.push({
        product: product._id,
        quantity,
        pickedQuantity: quantity,
        returnedQuantity: quantity,
        actualCost: cost,
        returnReason,
      });
    }

    if (products.length === 0) {
      console.warn(`❌ No valid products for credit memo ${memoNumber}`);
      skipped++;
      continue;
    }

    await CreditMemo.create({
      number: memoNumber,
      client: client._id,
      products,
      createdBy,
      routeAssigned,
      status: "received",
      subtotal,
      total: subtotal,
      returnedAt,
      createdAt: returnedAt,
    });

    created++;
  }

  console.log("✅ Credit memo import completed");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  process.exit(0);
}

importCreditMemos().catch(err => {
  console.error("❌ Import failed", err);
  process.exit(1);
});