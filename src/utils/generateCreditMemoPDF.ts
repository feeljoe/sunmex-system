import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo";

export function generateCreditMemoPDF(creditMemo: any) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Watermark ---
  function drawWatermark() {
    if (creditMemo.status === "cancelled") {
      const totalPages = doc.internal.pages.length;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(60);
        doc.text("CANCELLED", pageWidth / 2, pageHeight / 2, {
          angle: 45,
          align: "center",
        });
        doc.setTextColor(0);
      }
    }
  }

  // --- Sort products ---
  const sortedProducts = (creditMemo.products || []).sort((a: any, b: any) => {
    const nameA = (a.product?.name || "").toLowerCase();
    const nameB = (b.product?.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  let cursorY = 40;

  // --- Logo ---
  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 40, 20, 120, 50);

  // --- Company Info ---
  doc.setFontSize(10);
  doc.text(
    `Sunmex LLC
4645 W McDowell Rd Suite #102 
Phoenix, AZ 85035
www.sunmexusa.com`,
    pageWidth / 2,
    30,
    { align: "center" }
  );

  // --- Top Right Table ---
  autoTable(doc, {
    startY: 20,
    theme: "grid",
    head: [["Credit Memo", "Date"]],
    body: [[
      creditMemo.number || "NA",
      new Date(creditMemo.createdAt).toLocaleDateString()
    ]],
    tableWidth: 150,
    margin: { left: pageWidth - 190 },
    styles: { fontSize: 8, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
  });

  cursorY = 80;

  // -------------------
  // CLIENT INFO
  // -------------------
  autoTable(doc, {
    startY: cursorY + 10,
    theme: "grid",
    head: [["Applied To"]],
    body: [[creditMemo.client?.clientName || ""]],
    styles: { fontSize: 8, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    tableWidth: (pageWidth / 2) - 100,
  });

  autoTable(doc, {
    startY: cursorY + 10,
    theme: "grid",
    head: [["Pick Up From"]],
    body: [[
      `${creditMemo.client?.billingAddress?.addressLine || ""}, 
${creditMemo.client?.billingAddress?.city || ""}, ${creditMemo.client?.billingAddress?.state || ""}, ${creditMemo.client?.billingAddress?.country || ""}, ${creditMemo.client?.billingAddress?.zipCode || ""}`
    ]],
    styles: { fontSize: 8, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    margin: { left: pageWidth - 238 },
    tableWidth: (pageWidth / 2) - 100,
  });

  cursorY = (doc as any).lastAutoTable.finalY + 20;

  // -------------------
  // SALES PERSON / TERMS
  // -------------------
  autoTable(doc, {
    startY: cursorY + 10,
    theme: "grid",
    head: [["Sales Person"]],
    body: [[
      `${creditMemo.createdBy?.firstName || ""} ${creditMemo.createdBy?.lastName || ""}`
    ]],
    styles: { fontSize: 8, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    tableWidth: (pageWidth / 2) - 100,
  });

  autoTable(doc, {
    startY: cursorY + 10,
    theme: "grid",
    head: [["Terms"]],
    body: [[creditMemo.client?.paymentTerm?.name || ""]],
    styles: { fontSize: 8, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    margin: { left: pageWidth - 238 },
    tableWidth: (pageWidth / 2) - 100,
  });

  cursorY = (doc as any).lastAutoTable.finalY + 20;

  // -------------------
  // STATUS TITLE
  // -------------------
  doc.setFontSize(12);

  if (creditMemo.status === "cancelled") {
    doc.text("CANCELLED CREDIT MEMO", 40, cursorY + 10);
    cursorY += 15;
  } else if (creditMemo.status === "received") {
    doc.text("RECEIVED CREDIT MEMO", 40, cursorY + 10);
    cursorY += 15;
  } else {
    doc.text("PENDING CREDIT MEMO", 40, cursorY + 10);
    cursorY += 15;
  }

  // -------------------
  // PRODUCTS TABLE
  // -------------------
  autoTable(doc, {
    startY: cursorY + 5,
    head: [["Brand", "Product", "UPC", "SKU", "Qty", "Price", "Total", "Reason"]],
    body: sortedProducts.map((p: any) => {
      const unitPrice = p.actualCost || 0;
      const qty = p.quantity || 0;
      const upc = p.product.upc || "";
      const sku = p.product.sku || "";
      const brand = p.product?.brand?.name || "";
      const reason = p.returnReason || "";
      return [
        brand,
        `${p.product?.name} ${p.product.weight ? `${p.product.weight}${p.product.unit?.toUpperCase()}`: ""}` || "-",
        upc,
        sku,
        qty,
        `-$${(unitPrice).toFixed(2)}`,
        `-$${((qty * unitPrice)).toFixed(2)}`,
        reason,
      ];
    }),
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: "center"},
      5: { halign: "right" }, // Price
      6: { halign: "right" }, // Total
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    theme: "grid",
    didDrawPage: () => {
      drawWatermark();
    },
  });

  // -------------------
  // FOOTER (TOTAL)
  // -------------------
  const finalY = (doc as any).lastAutoTable.finalY;
  const blockHeight = 80;

  if (finalY + blockHeight > pageHeight - 40) {
    doc.addPage();
  }

  const baseY = Math.max(finalY + 20, pageHeight - 100);

  const isReceived = creditMemo.status === "received";
  const amountToShow = isReceived
    ? creditMemo.total
    : creditMemo.subtotal;

  autoTable(doc, {
    startY: baseY,
    theme: "grid",
    head: [[isReceived ? "Total Credit" : "Subtotal Credit"]],
    body: [[`-$${(amountToShow).toFixed(2)}`]],
    styles: { fontSize: 10, halign: "center" },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    tableWidth: 150,
    margin: { left: pageWidth - 190 },
  });
// -------------------
// SIGNATURE (LEFT SIDE)
// -------------------
if (creditMemo.status === "received" && creditMemo.returnSignature) {
  const sigX = 40;
  const sigY = baseY; // align with totals

  doc.setFontSize(10);
  doc.text("Received By:", sigX, sigY - 10);

  doc.addImage(
    creditMemo.returnSignature,
    "PNG",
    sigX,
    sigY,
    140,
    50
  );

  doc.setFontSize(9);
  doc.text(
    creditMemo.client?.clientName || "",
    sigX,
    sigY + 65
  );
}

  // --- Open PDF ---
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}