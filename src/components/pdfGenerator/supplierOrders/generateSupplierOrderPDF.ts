import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "@/utils/companyLogo";

export function generateSupplierOrderPDF(order: any) {
  const doc = new jsPDF();
  let cursorY = 15;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 14, 10, 40, 18);
  cursorY = 35;

  doc.setFontSize(18);
  doc.text("SUPPLIER PURCHASE ORDER", 14, cursorY);
  cursorY += 10;

  doc.setFontSize(12);
  doc.text(`PO Number: ${order.poNumber}`, 14, cursorY);
  cursorY += 7;

  doc.text(`Supplier: ${order.supplier?.name}`, 14, cursorY);
  cursorY += 7;

  doc.text(
    `Requested on: ${new Date(order.requestedAt).toLocaleDateString()}`,
    14,
    cursorY
  );
  cursorY += 7;

  doc.text(`Status: ${order.status.toUpperCase()}`, 14, cursorY);
  cursorY += 7;

  autoTable(doc, {
    startY: cursorY + 5,
    head: [["Product", "SKU", "Quantity", "Unit"]],
    body: order.products.map((p: any) => [
      p.product?.name || "-",
      p.product?.sku || "-",
      p.quantity,
      p.unit,
    ]),
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  if (order.expectedTotal != null) {
    doc.setFontSize(14);
    doc.text(
      `Expected Total: $${order.expectedTotal.toFixed(2)}`,
      14,
      cursorY
    );
  }

  doc.save(`PO-${order.poNumber}.pdf`);
}
