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

  const rows = inventory.map((it: any) => {
    // 1. Force all metrics to be numbers so math never breaks
    const currentInv = Number(it.currentInventory || 0);
    const preSavedInv = Number(it.preSavedInventory || 0);
    const onRouteInv = Number(it.onRouteInventory || 0);
    const inactiveInv = Number(it.inactiveInventory || 0);
    const unitCost = Number(it.product?.unitCost || 0);

    return {
      // 2. Safely extract strings and strip hidden spaces to perfectly match the Products export
      "SKU": it.product?.sku ? String(it.product.sku).trim() : "-",
      "UPC": it.product?.upc ? String(it.product.upc).trim() : "-",
      "Brand": it.product?.brand?.name ? String(it.product.brand.name?.toUpperCase()).trim() : "-",
      "Name": it.product?.name ? String(it.product.name?.toUpperCase()).trim() : "-",
      
      // 3. Combined total cost
      "Inventory $": (currentInv + preSavedInv) * unitCost,
      
      // 4. Separated costs
      "Current Inventory $": currentInv * unitCost,
      "Presaved Inventory $": preSavedInv * unitCost,
      
      // 5. Quantities
      "Current Inventory": currentInv,
      "Presaved Inventory": preSavedInv,
      "On Route Inventory": onRouteInv,
      "Inactive Inventory": inactiveInv,
    };
  });

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