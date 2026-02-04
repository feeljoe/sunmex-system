import * as dotenv from "dotenv";
dotenv.config();

import * as xlsx from "xlsx";
import { join } from "path";

import { connectToDatabase } from "../lib/db";
import Product from "../models/Product";
import ProductInventory from "../models/ProductInventory";

type ExcelRow = {
  sku: string;
  currentInventory: number;
};

async function importInventories() {
  await connectToDatabase();

  const projectRoot = join(__dirname, "../../");
  const excelPath = join(projectRoot, "src/scripts/Inventario.xlsx");

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<ExcelRow>(sheet);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.sku) {
      skipped++;
      continue;
    }

    const product = await Product.findOne({ sku: row.sku });
    if (!product) {
      console.warn(`❌ Product not found for SKU: ${row.sku}`);
      skipped++;
      continue;
    }

    const inventory = await ProductInventory.findOne({ product: product._id });
    if (!inventory) {
      console.warn(`❌ Inventory not found for SKU: ${row.sku}`);
      skipped++;
      continue;
    }

    inventory.currentInventory = Number(row.currentInventory) || 0;
    inventory.preSavedInventory = 0;
    inventory.onRouteInventory = 0;

    await inventory.save();
    updated++;
  }

  console.log("✅ Inventory import completed");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  process.exit(0);
}

importInventories().catch(err => {
  console.error("❌ Inventory import failed", err);
  process.exit(1);
});
