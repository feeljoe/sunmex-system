import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
// Note: Mongoose might need you to import the reference models so they are registered before populating
import "@/models/Brand"; 
import "@/models/Type";
import "@/models/Family";
import "@/models/Line";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Fetch ALL products and populate their relationships
    const products = await Product.find({})
      .populate("brand", "name")
      .populate("productType", "name")
      .lean();

      products.sort((a: any, b: any) => {
        // Safely grab the names, fallback to empty string if missing, and make lowercase for perfect A-Z sorting
        const brandA = (a.brand?.name || "").toLowerCase();
        const brandB = (b.brand?.name || "").toLowerCase();
  
        // Compare Brands first
        if (brandA < brandB) return -1;
        if (brandA > brandB) return 1;
  
        // If Brands are identical, compare Product Names
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
  
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
  
        return 0; // Exactly identical
      });

    // 2. Map the raw Mongoose documents into clean, flat objects for Excel
    const rows = products.map((p: any) => {
      const cost = p.unitCost || 0;
      const price = p.unitPrice || 0;
      const margin = price > 0 ? ((price - cost) / price) : 0;

      return {
        "SKU": p.sku || "-",
        "UPC": p.upc || "-",
        "Brand": p.brand?.name?.toUpperCase() || "-",
        "Product Name": p.name?.toUpperCase() || "-",
        "Category": p.productType?.name?.toUpperCase() || "-",
        "Unit Cost ($)": Number(cost),
        "Unit Price ($)": Number(price),
        "Margin (%)": Number(margin.toFixed(2)),
        "Weight": p.weight ? `${p.weight}${p.unit?.toUpperCase() || ""}`.trim() : "-",
        "Case Size": p.caseSize || "-",
        "Layer Size": p.layerSize || "-",
        "Pallet Size": p.palletSize || "-"
      };
    });

    // 3. Create a new Excel Workbook and Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Products");

    // 4. Generate the Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    // 5. Return the buffer as a downloadable file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("Excel Export Error:", error);
    return NextResponse.json({ error: "Failed to export products" }, { status: 500 });
  }
}