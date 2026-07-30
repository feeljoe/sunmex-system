import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Client from "@/models/Client";
// Import references to ensure Mongoose registers them before populating
import "@/models/Chain";
import "@/models/PaymentTerm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Fetch ALL clients and populate relationships
    const clients = await Client.find({})
      .populate("chain", "name")
      .populate("paymentTerm", "name")
      .lean();

    // 2. RAM Sorting Engine: Sort by Chain Name, then Client Name
    clients.sort((a: any, b: any) => {
      const chainA = (a.chain?.name || "zzz").toLowerCase();
      const chainB = (b.chain?.name || "zzz").toLowerCase();

      if (chainA < chainB) return -1;
      if (chainA > chainB) return 1;

      const nameA = (a.clientName || "zzz").toLowerCase();
      const nameB = (b.clientName || "zzz").toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      return 0; 
    });

    // 3. Map into clean, flat objects for Excel
    const rows = clients.map((c: any) => {
      // Format the nested address cleanly
      const addr = c.billingAddress;
      const fullAddress = addr 
        ? [addr.addressLine, addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ")
        : "-";

      return {
        "Client #": c.clientNumber || "-",
        "Client Name": c.clientName || "-",
        "Chain": c.chain?.name || "-",
        "Contact Name": c.contactName || "-",
        "Phone": c.phoneNumber || "-",
        "Billing Address": fullAddress,
        "Payment Term": c.paymentTerm?.name || "-",
        "Credit Limit ($)": c.creditLimit || 0,
        "Visit Frequency": c.frequency || "-",
        "Visiting Days": Array.isArray(c.visitingDays) ? c.visitingDays.join(", ") : "-"
      };
    });

    // 4. Create the Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Clients");

    // 5. Generate the buffer
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    // 6. Return as a downloadable file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="clients-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("Excel Export Error:", error);
    return NextResponse.json({ error: "Failed to export clients" }, { status: 500 });
  }
}