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

    inventory.sort((a: any, b: any) => {
      const brandA = a.product?.brand?.name?.toLowerCase() || "";
      const brandB = b.product?.brand?.name?.toLowerCase() || "";
  
      if (brandA !== brandB) {
        return brandA.localeCompare(brandB);
      }
  
      const nameA = a.product?.name?.toLowerCase() || "";
      const nameB = b.product?.name?.toLowerCase() || "";
      return nameA.localeCompare(nameB);
    });

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

    // 2. Build the exact Name Format (Name + Weight + Unit)
    const baseName = it.product?.name ? String(it.product.name.toUpperCase()).trim() : "-";
    const weight = it.product?.weight ? it.product.weight : "";
    const unit = it.product?.unit ? String(it.product.unit).toUpperCase() : "";
    const fullName = weight || unit ? `${baseName} ${weight}${unit}`.trim() : baseName;

    return {
      // 3. Extract strings with the requested column order
      "SKU": it.product?.sku ? String(it.product.sku).trim() : "-",
      "Vendor SKU": it.product?.vendorSku ? String(it.product.vendorSku).trim() : "-",
      "UPC": it.product?.upc ? String(it.product.upc).trim() : "-",
      "Brand": it.product?.brand?.name ? String(it.product.brand.name?.toUpperCase()).trim() : "-",
      "Name": fullName,
      "Case Size": it.product?.caseSize ? Number(it.product.caseSize) : "-",
      
      // 4. Combined total cost
      "Inventory $": (currentInv + preSavedInv) * unitCost,
      
      // 5. Separated costs
      "Current Inventory $": currentInv * unitCost,
      "Presaved Inventory $": preSavedInv * unitCost,
      
      // 6. Quantities
      "Current Inventory": currentInv,
      "Presaved Inventory": preSavedInv,
      "On Route Inventory": onRouteInv,
      "Inactive Inventory": inactiveInv,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // 7. Auto-size the columns for a professional layout
  worksheet["!cols"] = [
      { wch: 15 }, // SKU
      { wch: 15 }, // Vendor SKU
      { wch: 15 }, // UPC
      { wch: 20 }, // Brand
      { wch: 45 }, // Name
      { wch: 12 }, // Case Size
      { wch: 15 }, // Inventory $
      { wch: 20 }, // Current Inventory $
      { wch: 20 }, // Presaved Inventory $
      { wch: 18 }, // Current Inventory
      { wch: 18 }, // Presaved Inventory
      { wch: 18 }, // On Route Inventory
      { wch: 18 }, // Inactive Inventory
  ];

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