import jsPDF from "jspdf";

export function generateSupplierOrderPDF(order: any) {
    const doc = new jsPDF();

    doc.text(`Order Number: ${order.poNumber}`, 10, 10);
    doc.text(`Supplier: ${order.supplier.name}`, 10, 20);
    
    order.products.forEach((p: any, i: number) => {
        doc.text(
            `${p.product.name} - ${p.quantity} ${p.unit}`,
            10,
            40 + i * 10
        );
    });
    doc.save(`${order.poNumber}.pdf`);
}