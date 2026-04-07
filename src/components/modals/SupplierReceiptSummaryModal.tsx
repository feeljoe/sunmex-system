"use client";

interface Props {
  open: boolean;
  receipt: any;
  onClose: () => void;
}

export function SupplierReceiptSummaryModal({
  open,
  receipt,
  onClose,
}: Props) {
  if (!open || !receipt) return null;
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    received: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };

  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const exportPdf = () => {
    window.open(`/api/supplierReceipts/${receipt._id}/export/pdf`, "_blank");
  };

  const exportExcel = () => {
    window.open(`/api/supplierReceipts/${receipt._id}/export/excel`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-3xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Supplier Receipt Summary
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div><strong>Invoice:</strong> {receipt.invoice}</div>
          <div className="text-center"><strong>PO Number:</strong> {receipt.poNumber}</div>
          <div className="text-right"><strong>Supplier:</strong> {receipt.supplier?.name}</div>
          <div><strong>Status:</strong> <span className={`p-2 rounded-xl ${statusColors[receipt.supplierOrder.status]}`}>{receipt.supplierOrder.status.toUpperCase()}</span></div>
          <div className="text-center"><strong>Requested At:</strong> {formatDate(receipt.requestedAt)}</div>
          <div className="text-right"><strong>Received At:</strong> {formatDate(receipt.receivedAt)}</div>
        </div>
        <div className="py-4">
            <strong>Elaborated By:</strong>{" "}
            {receipt.elaboratedBy.firstName} {receipt.elaboratedBy.lastName}
          </div>
        <div className="h-100 overflow-auto rounded-xl shadow-xl">
            <table className="w-full">
                <thead className="bg-(--tertiary)">
                    <tr>
                        <th className="p-2 whitespace-nowrap">SKU</th>
                        <th className="p-2 whitespace-nowrap">UPC</th>
                        <th className="p-2 whitespace-nowrap">Product</th>
                        <th className="p-2 whitespace-nowrap">Ordered</th>
                        <th className="p-2 whitespace-nowrap">Received</th>
                        <th className="p-2 whitespace-nowrap">Unit Cost</th>
                        <th className="p-2 whitespace-nowrap">Actual Cost</th>
                        <th className="p-2 whitespace-nowrap">Total</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {receipt.items?.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-500">No Products to show</td>
                        </tr>
                    )}
                    {receipt.items?.map((item: any) => {
                        const lineTotal = (item.receivedQuantity ?? 0) * (item.actualCost ?? 0);
                        return (
                        <tr key={item._id} className="border-b">
                            <td className="p-2 whitespace-nowrap">{item.product?.sku}</td>
                            <td className="p-2 whitespace-nowrap">{item.product?.upc}</td>
                            <td className="p-2 whitespace-nowrap capitalize">{item.product?.name.toLowerCase()}</td>
                            <td className="p-2 text-center whitespace-nowrap">{item.orderedQuantity}</td>
                            <td className="p-2 text-center whitespace-nowrap">{item.receivedQuantity}</td>
                            <td className="p-2 text-center whitespace-nowrap">{formatCurrency(item.unitCost)}</td>
                            <td className="p-2 text-center whitespace-nowrap">{formatCurrency(item.actualCost)}</td>
                            <td className="p-2 text-right font-bold whitespace-nowrap">{formatCurrency(lineTotal)}</td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <div className="flex justify-end text-2xl mt-4"><strong>Total: </strong> {formatCurrency(receipt.total)}</div>
        {/* Footer buttons */}
        <div className="flex justify-between gap-3 mt-6">
          <button
            title="Export to PDF"
            onClick={exportPdf}
            className="px-2 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </button>

          <button
            title="Export to Excel"
            onClick={exportExcel}
            className="px-2 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
