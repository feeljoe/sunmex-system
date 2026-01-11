"use client";

import { generatePreorderPDF } from "@/utils/generatePreorderPDF";

export default function PreorderDetailsModal({
  preorder,
  onClose,
}: {
  preorder: any;
  onClose: () => void;
}) {
  /* -----------------------------
     HELPERS
  ------------------------------*/
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  /* -----------------------------
     PRODUCTS (SORTED)
  ------------------------------*/
  const sortedProducts = [...(preorder.products ?? [])].sort((a: any, b: any) => {
    const brandA = a.productInventory?.product?.brand?.name?.toLowerCase() ?? "";
    const brandB = b.productInventory?.product?.brand?.name?.toLowerCase() ?? "";
    if (brandA !== brandB) return brandA.localeCompare(brandB);

    return (
      a.productInventory?.product?.name?.localeCompare(
        b.productInventory?.product?.name
      ) ?? 0
    );
  });

  /* =============================
     RENDER
  ==============================*/
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-(--secondary) rounded-xl shadow-xl w-4/5 max-w-5xl p-6 space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">
            Preorder Details – {preorder.client?.clientName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
          >
            ✕
          </button>
        </div>
        <h3>Location: {preorder.client?.billingAddress?.addressLine}</h3>

        {/* META INFO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Route</span>
            <div>{preorder.routeAssigned?.code ?? "-"}</div>
          </div>

          <div>
            <span className="font-semibold">Status</span>
            <div className="capitalize">{preorder.status}</div>
          </div>

          <div>
            <span className="font-semibold">Created</span>
            <div>
              {formatDate(preorder.createdAt)}{" "}
              {formatTime(preorder.createdAt)}
            </div>
          </div>

          <div>
            <span className="font-semibold">Payment Status</span>
            <div className="uppercase">{preorder.paymentStatus}</div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">UPC</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="bg-(--secondary)">
              {sortedProducts.map((p: any) => {
                const unitPrice =
                  p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0;

                return (
                  <tr key={p.productInventory?._id} className="border-t">
                    <td className="p-2">
                      {p.productInventory?.product?.brand?.name}
                    </td>
                    <td className="p-2">
                      {p.productInventory?.product?.name}
                    </td>
                    <td className="p-2">
                      {p.productInventory?.product?.upc}
                    </td>
                    <td className="p-2 text-center">
                      {p.quantity}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(p.quantity * unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        {preorder.total > 0 &&
        <div className="flex justify-end text-2xl font-semibold">
          Total: {formatCurrency(preorder.total)}
        </div>
        }
        {(preorder.total === 0 && preorder.subtotal > 0) &&
        <div className="flex justify-end text-2xl font-semibold">
          Subtotal: {formatCurrency(preorder.subtotal)}
        </div>
        }

        {/* ACTIONS */}
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={() => generatePreorderPDF(preorder)}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="bg-gray-300 px-5 py-3 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
