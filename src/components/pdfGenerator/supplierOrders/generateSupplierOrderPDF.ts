import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "@/utils/companyLogo";

export async function generateSupplierOrderPDF(order: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const response = await fetch("/api/company-settings", {
    cache: "no-store",
  });
  if(!response.ok){
    throw new Error("Failed to load company settings");
  }
  const company = await response.json();
  const address = company?.address;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 14, 10, 40, 18);
  
  doc.setFontSize(11);
  const companyInfo = [
    company?.companyName,
    `${address?.street} ${address?.street2}`,
    `${address?.city} ${address?.state} ${address?.zipCode}`,
    `Tel: ${company?.phone}`,
    `Email: ${company?.email}`,
    company?.website,
  ];
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

    const qtyCases = caseSize ? (qtyUnits/caseSize) : "-";
    const productName = `${p.product?.name} ${p.product?.weight}${p.product?.unit?.toUpperCase()}`.trim(); 
    return [
      p.product?.brand?.name || "-",
      productName || "-",
      p.product?.sku || "-",
      p.product?.vendorSku || "-",
      qtyUnits,
      qtyCases,
    ];
  });

  autoTable(doc, {
    startY: infoY + 10,
    head: [["Brand", "Product", "SKU", "Vendor SKU", "Qty Units", "Qty Cases"]],
    body: tableRows,
    styles: {
      fontSize: 9
    },
    headStyles:{
      fillColor: [0,0,0]
    }
  });

  doc.save(`${order.poNumber}.pdf`);
}
