import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo";

export function generateCreditMemoPDF(creditMemo: any) {

  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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

  const sortedProducts = creditMemo.products.sort((a: any, b: any) => {
    const nameA = (a.product?.name || "").toLowerCase();
    const nameB = (b.product?.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  let cursorY = 40;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 40, 20, 120, 50);

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
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
  });

  cursorY = 100;

  // Status Header
  doc.setFontSize(12);

  if (creditMemo.status === "received") {
    doc.text("RECEIVED CREDIT MEMO", 40, cursorY);
  } else if (creditMemo.status === "cancelled") {
    doc.text("CANCELLED CREDIT MEMO", 40, cursorY);
  } else {
    doc.text("PENDING CREDIT MEMO", 40, cursorY);
  }

  cursorY += 20;

  autoTable(doc, {
    startY: cursorY,
    head: [["Product", "Qty", "Price", "Total"]],
    body: sortedProducts.map((p: any) => {

      const unitPrice = p.actualCost || 0;
      const lineTotal = p.quantity * unitPrice;

      return [
        p.product?.name || "-",
        p.quantity,
        `$${(-unitPrice).toFixed(2)}`,
        `$${(-lineTotal).toFixed(2)}`
      ];
    }),
    styles: { fontSize: 8 },
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

  const footerY = pageHeight - 100;

  const isReceived = creditMemo.status === "received";
  const amountToShow = isReceived
    ? creditMemo.total
    : creditMemo.subtotal;

  autoTable(doc, {
    startY: footerY,
    theme: "grid",
    head: [[isReceived ? "Total Credit" : "Subtotal Credit"]],
    body: [[ `$${(-amountToShow).toFixed(2)}` ]],
    styles: { fontSize: 12, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    tableWidth: 170,
    margin: { left: pageWidth - 210 },
  });

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}