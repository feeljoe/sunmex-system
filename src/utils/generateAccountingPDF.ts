import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_LOGO_BASE64 } from "./companyLogo"; 
import { formatCurrency } from "./format";           

export function generateAccountingPDF(orders: any[], filters: any) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. LOGO & COMPANY INFO
  const logoWidth = 120;
  const logoHeight = 50;
  doc.addImage(COMPANY_LOGO_BASE64, "PNG", 40, 20, logoWidth, logoHeight);

  const companyInfo = `Sunmex LLC\n4645 W McDowell Rd Suite #102\nPhoenix, AZ 85035\nwww.sunmexusa.com`;
  doc.setFontSize(10);
  doc.text(companyInfo, pageWidth / 2, 30, { align: "center" });

  // 2. REPORT DATE
  autoTable(doc, {
    startY: 20,
    theme: "grid",
    head: [["Report Date"]],
    body: [[new Date().toLocaleDateString()]],
    tableWidth: 120,
    margin: { left: pageWidth - 160 },
    styles: { fontSize: 8, halign: "center" },
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  let cursorY = 80;

  // 3. APPLIED FILTERS BOX
  const filterBody = [];
  if (filters.from || filters.to) filterBody.push([`Dates: ${filters.from || "Any"} to ${filters.to || "Any"}`]);
  if (filters.chain !== "All Chains") filterBody.push([`Chain: ${filters.chain}`]);
  if (filters.client !== "All Clients") filterBody.push([`Client: ${filters.client}`]);

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    head: [["Report information"]],
    body: filterBody,
    tableWidth: 250,
    margin: { left: 40 },
    styles: { fontSize: 8, halign: "left" },
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 20;

  // 4. MAIN INVOICE LIST
  doc.setFontSize(12);
  doc.text("PAYMENT STATUS REPORT", 40, cursorY + 10);
  cursorY += 20;

  let totalSum = 0;
  let balanceSum = 0;

  const tableBody = orders.map((o: any) => {
    const dateStr = o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString() : "-";
    const docTotal = o.type === "creditMemo" ? Math.abs(o.credits) : (o.total || 0);
    const displayTotal = o.type === "creditMemo" ? -docTotal : docTotal;
    
    totalSum += displayTotal;
    balanceSum += o.balance || 0;

    return [
      o.number || "-",
      o.type === "creditMemo" ? "Credit Memo" : o.type === "directSale" ? "Direct Sale" : "Preorder",
      o.client?.name || "-",
      dateStr,
      formatCurrency(docTotal),
      formatCurrency(o.balance || 0),
      (o.computedStatus || "PENDING").toUpperCase(),
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    head: [["Invoice #", "Type", "Client", "Date", "Total", "Balance", "Status"]],
    body: tableBody,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: {
      4: { halign: "right" }, 
      5: { halign: "right" }, 
      6: { halign: "center", fontStyle: "bold" }, 
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 6) {
        const status = data.cell.raw;
        if (status === 'PAID') data.cell.styles.textColor = [22, 163, 74]; 
        if (status === 'OVERDUE') data.cell.styles.textColor = [220, 38, 38]; 
        if (status === 'UNPAID') data.cell.styles.textColor = [234, 88, 12]; 
      }
    }
  });

  // 5. REPORT TOTALS
  const finalY = (doc as any).lastAutoTable.finalY;
  const baseY = Math.max(finalY + 20, pageHeight - 100);

  if (finalY + 60 > pageHeight - 40) doc.addPage();

  autoTable(doc, {
    startY: finalY + 20,
    theme: "grid",
    head: [["Total Balance Owed"]],
    body: [[formatCurrency(balanceSum)]],
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold", halign: "center" },
    tableWidth: 220,
    margin: { left: pageWidth - 260 },
  });

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}