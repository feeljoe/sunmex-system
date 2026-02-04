import * as dotenv from "dotenv";
dotenv.config();

import * as xlsx from "xlsx";
import { join } from "path";
import mongoose from "mongoose";

import { connectToDatabase } from "../lib/db";
import Preorder from "../models/PreOrder";
import Client from "../models/Client";
import Product from "../models/Product";
import ProductInventory from "../models/ProductInventory";
import Route from "../models/Route";

const FALLBACK_USER_ID = new mongoose.Types.ObjectId("696465f161f2df04e4abaa75");

type ExcelRow = {
  number: string;
  sku: string;
  clientNumber: string;
  routeVendor: string;
  routeDriver: string;
  deliveryDate: number | string | Date;
  actualCost: number;
  quantity: number;
};

function parseExcelDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  return new Date(value);
}

export async function importPreorders() {
  await connectToDatabase();

  const projectRoot = join(__dirname, "../../");
  const excelPath = join(projectRoot, "src/scripts/Preorders.xlsx");

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<ExcelRow>(sheet);

  // 🔹 Group by preorder number
  const grouped = new Map<string, ExcelRow[]>();
  for (const row of rows) {
    if (!grouped.has(row.number)) grouped.set(row.number, []);
    grouped.get(row.number)!.push(row);
  }

  let created = 0;
  let skipped = 0;

  for (const [preorderNumber, group] of Array.from(grouped.entries())) {
    const first = group[0];

    const client = await Client.findOne({ clientNumber: first.clientNumber });
    if (!client) {
      console.warn(`❌ Client not found: ${first.clientNumber}`);
      skipped++;
      continue;
    }

    const deliveryDate = parseExcelDate(first.deliveryDate);
    if (isNaN(deliveryDate.getTime())) {
      console.warn(`❌ Invalid delivery date for preorder ${preorderNumber}`);
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
        console.warn(`❌ Product not found: ${row.sku} (Preorder ${preorderNumber})`);
        skipped++;
        continue;
      }

      const inventory = await ProductInventory.findOne({ product: product._id });
      if (!inventory) {
        console.warn(`❌ Inventory not found for SKU ${row.sku}`);
        skipped++;
        continue;
      }

      const qty = Number(row.quantity);
      const cost = Number(row.actualCost);

      subtotal += qty * cost;

      products.push({
        productInventory: inventory._id,
        quantity: qty,
        pickedQuantity: qty,
        deliveredQuantity: qty,
        actualCost: cost,
      });
    }

    await Preorder.create({
      number: preorderNumber,
      client: client._id,
      products,
      createdBy,
      routeAssigned,
      deliveryDate,
      createdAt: deliveryDate,
      deliveredAt: deliveryDate,
      status: "delivered",
      subtotal,
      total: subtotal,
      paymentStatus: "pending",
    });

    created++;
  }

  console.log("✅ Preorder import completed (NO INVENTORY)");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  process.exit(0);
}

importPreorders().catch(err => {
  console.error("❌ Import failed", err);
  process.exit(1);
});
