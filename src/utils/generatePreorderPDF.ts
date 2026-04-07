import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo";

export function generatePreorderPDF(preorder: any) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // --- Helper for watermark/status label on every page ---
  function drawWatermark() {
    if (preorder.status === "cancelled") {
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

  const filteredProducts = (preorder.products || []).filter((p: any) => {
    if (preorder.status === "ready") {
      return (p.pickedQuantity ?? 0) > 0;
    }
  
    if (preorder.status === "delivered") {
      return (p.deliveredQuantity ?? 0) > 0;
    }
  
    return (p.quantity ?? 0) > 0; // optional safety
  });
  
  const sortedProducts = filteredProducts.sort((a: any, b: any) => {
    const prodA = a.productInventory.product;
    const prodB = b.productInventory.product;
  
    const brandA = (prodA.brand?.name || "").toLowerCase();
    const brandB = (prodB.brand?.name || "").toLowerCase();
    if (brandA < brandB) return -1;
    if (brandA > brandB) return 1;
  
    const nameA = (prodA.name || "").toLowerCase();
    const nameB = (prodB.name || "").toLowerCase();
  
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
  
    return 0;
  });

  let cursorY = 40;

  const logoWidth = 120;
  const logoHeight = 50;

  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 40, 20, logoWidth, logoHeight);

  const companyInfo = `Sunmex LLC
  4645 W McDowell Rd Suite #102 
  Phoenix, AZ 85035
  www.sunmexusa.com`;
  doc.setFontSize(10);
  doc.text(companyInfo, pageWidth/2, 30, {align: "center"});

  autoTable(doc, {
    startY: 20,
    theme: "grid",
    head: [["Invoice", "Date"]],
    body: [
      [
        preorder.number || "NA",
        new Date(preorder.createdAt).toLocaleDateString(),
      ],
    ],
    tableWidth: 150,
    margin: { left: pageWidth - 190 },
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
  });

  cursorY = 80;

  //Client info
  autoTable(doc, {
    startY: cursorY+10,
    theme: "grid",
    head: [[ "Sold To"]],
    body: [[ preorder.client.clientName],],
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    tableWidth: (pageWidth / 2) - 100,
  });
  autoTable(doc, {
    startY: cursorY+10,
    theme: "grid",
    head: [[ "Ship To"]],
    body: [[ preorder.client.billingAddress.addressLine + ", " + preorder.client.billingAddress.city + ", " + preorder.client.billingAddress.state + ", " + preorder.client.billingAddress.country + ", " + preorder.client.billingAddress.zipCode],],
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: {left: pageWidth - 238},
    tableWidth: (pageWidth / 2) - 100,
  });

  cursorY = (doc as any) .lastAutoTable.finalY + 20;
  
  autoTable(doc, {
    startY: cursorY+10,
    theme: "grid",
    head: [[ "Sales Person"]],
    body: [[ `${preorder.createdBy.firstName} ${preorder.createdBy.lastName}`],],
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    tableWidth: (pageWidth / 2) - 100,
  });
  autoTable(doc, {
    startY: cursorY+10,
    theme: "grid",
    head: [[ "Terms"]],
    body: [[ preorder.client.paymentTerm.name],],
    styles: { fontSize: 8, halign: "center"},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: {left: pageWidth - 238},
    tableWidth: (pageWidth / 2) - 100,
  });
  
  cursorY = (doc as any) .lastAutoTable.finalY + 20;

  // --- Status title ---
if (preorder.status === "cancelled") {
  doc.setFontSize(12);
  doc.text("CANCELLED ORDER", 40, cursorY + 10);
  if(preorder.status === "cancelled") {
    doc.text(
      `Cancelled on: ${new Date(preorder.cancelledAt).toLocaleDateString()}`,
      pageWidth - 170,
      cursorY
    );
    cursorY += 7;
  }
  cursorY += 15;
} else if (preorder.status === "delivered") {
  doc.setFontSize(12);
  doc.text("DELIVERY CONFIRMATION", 40, cursorY + 10);
  if(preorder.status === "delivered") {
    doc.text(
      `Delivered on: ${new Date(preorder.deliveredAt).toLocaleDateString()}`,
      pageWidth - 170,
      cursorY + 10
    );
  }
  cursorY += 15;
} else {
  doc.setFontSize(12);
  doc.text("ORDER CONFIRMATION", 40, cursorY + 10);
  cursorY += 15;
}

  if(preorder.cancelReason) {
    doc.text(
      `Reason for Cancellation: ${preorder.cancelReason}`,
      40,
      cursorY
    );
    cursorY += 25;
  }
  let totalPages = 0;

  autoTable(doc, {
    startY: cursorY + 5,
    head: [["Brand", "Product", "UPC", "SKU", "Qty", "Price", "Total"]],
    body: sortedProducts.map((p: any) => {
      const prod = p.productInventory.product;
      const price = p.actualCost ?? 0;
      const qty =
        preorder.status === "delivered"
          ? (p.deliveredQuantity ?? 0)
          : preorder.status === "ready"
          ? (p.pickedQuantity ?? 0)
          : (p.quantity ?? 0);

      return [
        prod.brand?.name || "-",
        `${prod.name} ${
          prod.weight && prod.unit
            ? prod.weight + "" + prod.unit.toUpperCase()
            : ""
        }`,
        prod.upc,
        prod.sku,
        qty,
        `$${price.toFixed(2)}`,
        `$${(qty * price).toFixed(2)}`,
      ];
    }),
    styles: {fontSize: 8},
    headStyles: {
      fillColor: [0, 102, 204], // RGB color (blue)
      textColor: 255,           // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    theme: "grid",
    didDrawPage: (data) => {
      drawWatermark();
    },
  });
  totalPages = (doc as any).internal.getNumberOfPages();
  doc.setPage(totalPages);
  
  const finalY = (doc as any).lastAutoTable.finalY;
const blockHeight = 80; // space for totals + signature

// If not enough space → move to new page
if (finalY + blockHeight > pageHeight - 40) {
  doc.addPage();
}

// ✅ Use dynamic Y (NOT fixed pageHeight)
const baseY = Math.max(finalY + 20, pageHeight - 100);

const isDelivered = preorder.status === "delivered";
const amountToShow = isDelivered
  ? preorder.total
  : preorder.subtotal;

// -------------------
// TOTAL (RIGHT SIDE)
// -------------------
autoTable(doc, {
  startY: baseY,
  theme: "grid",
  head: [[isDelivered ? "Total" : "Subtotal"]],
  body: [[`$${amountToShow.toFixed(2)}`]],
  styles: { fontSize: 8, halign: "center" },
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
if (preorder.status === "delivered" && preorder.deliverySignature) {
  const sigX = 40;
  const sigY = baseY; // align with totals

  doc.setFontSize(10);
  doc.text("Received By:", sigX, sigY - 10);

  doc.addImage(
    preorder.deliverySignature,
    "PNG",
    sigX,
    sigY,
    140,
    50
  );

  doc.setFontSize(9);
  doc.text(preorder.client.clientName, sigX, sigY + 65);
}

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}
