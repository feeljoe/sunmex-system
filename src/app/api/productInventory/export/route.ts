import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import * as XLSX from "xlsx";

export async function GET() {
  await connectToDatabase();

  const inventory = await ProductInventory.find()
    .populate({
      path: "product",
      populate: { path: "brand" },
    })
    .lean();

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();

  const fileName = `${mm}-${dd}-${yyyy} Inventory.xlsx`;

  const rows = inventory.map((it: any) => ({
    SKU: it.product?.sku ?? "",
    UPC: it.product?.upc ?? "",
    Brand: it.product?.brand?.name ?? "",
    Name: it.product?.name ?? "",
    "Inventory $": (it.currentInventory * (it.product?.unitCost ?? 0)).toFixed(2),
    "Current Inventory": it.currentInventory ?? 0,
    "Presaved Inventory": it.preSavedInventory ?? 0,
    "On Route Inventory": it.onRouteInventory ?? 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
