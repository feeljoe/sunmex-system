import * as XLSX from "xlsx";

export function exportSupplierOrderExcel(order: any) {
  const rows = order.products.map((p: any) => ({
    "PO Number": order.poNumber,
    Supplier: order.supplier?.name,
    Product: p.product?.name,
    SKU: p.product?.sku,
    Quantity: p.quantity,
    Unit: p.unit,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Order");

  XLSX.writeFile(workbook, `PO-${order.poNumber}.xlsx`);
}
