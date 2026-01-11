import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo";

export function generatePreorderPDF(preorder: any) {
  const doc = new jsPDF();
  let cursorY = 15;

  doc.addImage(
    COMPANY_LOGO_BASE64,
    "PNG",
    14,
    10,
    40,
    18
  );
  cursorY = 35;

  if(preorder.status === "cancelled"){
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(40);
    doc.text("CANCELLED", 105, 80, {
      angle: 45,
      align: "center",
    });

    doc.setTextColor(0);
    doc.setFontSize(18);
    doc.text("CANCELLED ORDER", 14, cursorY);
    cursorY += 10;
  } else if (preorder.status === "delivered"){
    doc.setFontSize(18);
    doc.text("DELIVERY CONFIRMATION", 14, cursorY);
    cursorY += 10;
  }else {
    doc.setFontSize(18);
    doc.text("DELIVERY ORDER", 14, cursorY);
    cursorY += 10;
  }


  doc.setFontSize(12);
  doc.text(`Client: ${preorder.client.clientName}`, 14, cursorY);
  cursorY += 7;

  doc.text(`Invoice: ${preorder.number}`, 14, cursorY);
  cursorY += 7;

  if(preorder.status === "delivered") {
    doc.text(
      `Delivered on: ${new Date(preorder.deliveredAt).toLocaleDateString()}`,
      14,
      cursorY
    );
    cursorY += 7;
  }

  if(preorder.status === "cancelled") {
    doc.text(
      `Cancelled on: ${new Date(preorder.cancelledAt).toLocaleDateString()}`,
      14,
      cursorY
    );
    cursorY += 7;
  }

  if(preorder.cancelReason) {
    doc.text(
      `Reason: ${preorder.cancelReason}`,
      14,
      cursorY
    );
    cursorY += 7;
  }

  autoTable(doc, {
    startY: cursorY + 5,
    head: [["Brand", "Product", "SKU", "Qty", "Price", "Total"]],
    body: preorder.products.map((p: any) => {
      const prod = p.productInventory.product;
      return [
        prod.brand?.name || "-",
        prod.name,
        prod.sku,
        p.quantity,
        `$${prod.unitPrice.toFixed(2)}`,
        `$${(p.quantity * prod.unitPrice).toFixed(2)}`,
      ];
    }),
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.text(
    `Grand Total: $${preorder.total.toFixed(2)}`,
    14,
    cursorY
  );

  if(preorder.status === "delivered" && preorder.deliverySignature) {
    cursorY += 15;
    doc.setFontSize(12);
    doc.text("Client Signature:", 14, cursorY);
    doc.addImage(
      preorder.deliverySignature,
      "PNG",
      14,
      cursorY + 5,
      80,
      30
    );
  }

  const statusLabel =
    preorder.status === "cancelled"
    ? "CANCELLED"
    : preorder.status === "delivered"
    ? "DELIVERED"
    : "ORDER";

  doc.save(`${statusLabel}-${preorder.number || "NA"}.pdf`);
}
