import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Brand from "@/models/Brand"; 
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Fetch ALL products and populate their relationships
    const brands = await Brand.find({})
        .sort({"name": 1})
      .lean();

    // 2. Map the raw Mongoose documents into clean, flat objects for Excel
    const rows = brands.map((p: any) => {
      return {
        "Name": p.name || "-"
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