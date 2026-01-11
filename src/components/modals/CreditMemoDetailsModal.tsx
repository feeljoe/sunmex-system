"use client";

export default function CreditMemoDetailsModal({
  creditMemo,
  onClose,
}: {
  creditMemo: any;
  onClose: () => void;
}) {
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

  const formatDateTime = (v?: string) =>
    v ? new Date(v).toLocaleString() : "-";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-xl shadow-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 border-b">
          <h2 className="text-2xl font-semibold">
            Credit Memo #{creditMemo.number}
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 cursor-pointer transition-all duration:300 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* HEADER INFO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <strong>Client</strong>
            <div>{creditMemo.client?.clientName}</div>
          </div>
          <div>
            <strong>Status</strong>
            <div className="capitalize">{creditMemo.status}</div>
          </div>
          <div>
            <strong>Created At</strong>
            <div>{formatDateTime(creditMemo.createdAt)}</div>
          </div>

          <div>
            <strong>Created By</strong>
            <div>
              {creditMemo.createdBy?.firstName}{" "}
              {creditMemo.createdBy?.lastName}
            </div>
          </div>

          <div>
            <strong>Returned At</strong>
            <div>{formatDateTime(creditMemo.returnedAt)}</div>
          </div>

          {creditMemo.status === "cancelled" && (
            <>
              <div>
                <strong>Cancelled At</strong>
                <div>{formatDateTime(creditMemo.cancelledAt)}</div>
              </div>
              <div>
                <strong>Cancelled By</strong>
                <div>
                  {creditMemo.cancelledBy?.firstName}{" "}
                  {creditMemo.cancelledBy?.lastName}
                </div>
              </div>
              <div>
                <strong>Cancel Reason</strong>
                <div>{creditMemo.cancelReason}</div>
              </div>
            </>
          )}
        </div>

        {/* PRODUCTS TABLE */}
        <h3 className="text-xl font-semibold mb-2">Products</h3>

        <div className="rounded-xl mb-6 bg-(--tertiary) shadow-xl">
        <table className="w-full text-sm overflow-auto">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-center">UPC</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-center">Picked</th>
              <th className="p-2 text-center">Returned</th>
              <th className="p-2 text-right">Cost</th>
              <th className="p-2 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {creditMemo.products.map((p: any, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="p-2">
                  {p.product.name ||
                    "-"}
                </td>
                <td className="p-2 text-center">
                  {p.product.upc ||
                    "-"}
                </td>
                <td className="p-2 text-center">{p.quantity}</td>
                <td className="p-2 text-center">{p.pickedQuantity ?? "-"}</td>
                <td className="p-2 text-center">{p.returnedQuantity ?? "-"}</td>
                <td className="p-2 text-right">
                  {formatCurrency(p.actualCost)}
                </td>
                <td className="p-2 capitalize">{p.returnReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end gap-10 text-lg">
          <div>
            <strong>Subtotal:</strong> {formatCurrency(creditMemo.subtotal)}
          </div>
          <div>
            <strong>Total:</strong> {formatCurrency(creditMemo.total)}
          </div>
        </div>
      </div>
    </div>
  );
}
