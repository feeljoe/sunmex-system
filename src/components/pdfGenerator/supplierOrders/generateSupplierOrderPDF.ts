import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "@/utils/companyLogo";

export function generateSupplierOrderPDF(order: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 14, 10, 40, 18);
  
  doc.setFontSize(11);
  const companyInfo = [
    "Sunmex LLC",
    "4645 W McDowell Rd Ste 102",
    "Phoenix AZ 85035",
    "Tel: (520) 882-2658",
    "bromero@sunmexusa.com",
  ]
  let companyY = 15;

  companyInfo.forEach(line => {
    doc.text(line, pageWidth / 2, companyY, {align: "center"});
    companyY += 5;
  });
  //doc.setFontSize(16);

  //doc.text("SUPPLIER PURCHASE ORDER", pageWidth / 2, companyY + 5, {align: "center"});

  const addr = order.supplier?.billingAddress;

  const supplierAddress = addr
  ? `${addr.addressLine || ""}\n ${addr.city || ""} ${addr.state || ""}, ${addr.zipCode || ""}`
    : "";

  let infoY = 15;

  doc.text(`PURCHASE ORDER: ${order.poNumber}`, pageWidth -10, infoY, {align: "right"});
  infoY +=6;

  doc.text(
    `Date: ${new Date(order.requestedAt).toLocaleDateString()}`,
    pageWidth -10,
    infoY,
    {align: "right"}
  );
  infoY +=6;

  doc.text(`Supplier: ${order.supplier?.name || ""}`, pageWidth -10, infoY, { align: "right" });
  infoY += 6;

  if (supplierAddress.trim()) {
    doc.setFontSize(9);
    doc.text(supplierAddress, pageWidth -10, infoY, { align: "right" });
    infoY += 6;
  }

  const tableRows = order.products.map((p: any) => {
    const qtyUnits = p.quantity || 0;
    const caseSize = p.product?.caseSize || null;
    const unitCost = p.product?.unitCost || 0;

    const qtyCases = caseSize ? (qtyUnits/caseSize) : "-";
    const casePrice = caseSize ? (unitCost * caseSize) : "-";
    const totalPrice = qtyUnits * unitCost;

    return [
      p.product?.brand?.name || "-",
      p.product?.name || "-",
      p.product?.sku || "-",
      p.product?.vendorSku || "-",
      qtyUnits,
      qtyCases,
      casePrice !== "-" ? `$${casePrice.toFixed(2)}` : "-",
      `$${totalPrice.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: infoY + 10,
    head: [["Brand", "Product", "SKU", "Vendor SKU", "Qty Units", "Qty Cases", "Case Price", "Total Price"]],
    body: tableRows,
    styles: {
      fontSize: 9
    },
    headStyles:{
      fillColor: [0,0,0]
    }
  });

  if (order.expectedTotal != null) {
    doc.setFontSize(14);
    const bottomY = pageHeight -20;
    doc.text(
      `Expected Total: $${order.expectedTotal.toFixed(2)}`,
      14,
      bottomY
    );
  }

  doc.save(`${order.poNumber}.pdf`);
}
