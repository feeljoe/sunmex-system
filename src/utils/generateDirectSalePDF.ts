import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo";

export function generateDirectSalePDF(directSale: any) {
  const doc = new jsPDF();
  let cursorY = 15;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 14, 10, 40, 18);
  cursorY = 35;

  doc.setFontSize(18);
  doc.text("DIRECT SALE CONFIRMATION", 14, cursorY);
  cursorY += 10;

  doc.setFontSize(12);
  doc.text(`Client: ${directSale.client.clientName}`, 14, cursorY);
  cursorY += 7;

  doc.text(`Invoice: ${directSale.number}`, 14, cursorY);
  cursorY += 7;

  doc.text(
    `Delivered on: ${new Date(directSale.deliveredAt).toLocaleDateString()}`,
    14,
    cursorY
  );
  cursorY += 7;

  autoTable(doc, {
    startY: cursorY + 5,
    head: [["Brand", "Product", "SKU", "Qty", "Price", "Total"]],
    body: directSale.products.map((p: any) => {
      const prod = p.productInventory.product;
      return [
        prod.brand?.name || "-",
        prod.name,
        prod.sku,
        p.quantity,
        `$${p.unitPrice.toFixed(2)}`,
        `$${(p.quantity * p.unitPrice).toFixed(2)}`,
      ];
    }),
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.text(`Grand Total: $${directSale.total.toFixed(2)}`, 14, cursorY);

  if (directSale.signature) {
    cursorY += 15;
    doc.setFontSize(12);
    doc.text("Client Signature:", 14, cursorY);
    doc.addImage(directSale.signature, "PNG", 14, cursorY + 5, 80, 30);
  }

  doc.save(`DS-${directSale.number || "NA"}.pdf`);
}
