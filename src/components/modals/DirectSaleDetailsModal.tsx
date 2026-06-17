"use client";

import { generateDirectSalePDF } from "@/utils/generateDirectSalePDF";
import { useRouter } from "next/navigation";
export default function DirectSaleDetailsModal({
  directSale,
  onClose,
}: {
  directSale: any;
  onClose: () => void;
}) {
  /* -----------------------------
     HELPERS
  ------------------------------*/
  const statusColorsPreorder: Record<string, string> = {
    pending: "bg-gray-300",
    assigned: "bg-(--tertiary)",
    ready: "bg-blue-500 text-white",
    delivered: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  }; 
  const statusColorsPayment: Record<string, string> = {
    pending: "bg-gray-300",
    paid: "bg-green-500 text-white",
  }; 
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
  const sortedProducts = [...(directSale.products ?? [])].sort((a: any, b: any) => {
    const brandA = a.product?.brand?.name?.toLowerCase() ?? "";
    const brandB = b.product?.brand?.name?.toLowerCase() ?? "";
    if (brandA !== brandB) return brandA.localeCompare(brandB);

    return (
      a.product?.name?.localeCompare(
        b.product?.name
      ) ?? 0
    );
  });
  let totalQty = 0;
  const router = useRouter();
  /* =============================
     RENDER
  ==============================*/
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-2xl lg:max-w-5xl p-2 space-y-2">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4 py-2 border-b">
          <h2 className="lg:text-2xl font-semibold">
            Direct Sale details for #{directSale.number}
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 cursor-pointer transition-all duration:300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h2 className="text-xl font-semibold text-center">
            {directSale.client?.clientName}
          </h2>
        <h3 className="text-center mb-4">Address: {directSale.client?.billingAddress?.addressLine}, {directSale.client?.billingAddress?.city}, {directSale.client?.billingAddress?.state}, {directSale.client?.billingAddress?.country}, {directSale.client?.billingAddress?.zipCode} </h3>

        {/* META INFO */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm text-center">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Route</span>
            <div>{directSale.route?.code ?? "-"}</div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Created By</span>
            <div>{directSale.createdBy?.firstName ?? "-"} {directSale.createdBy?.lastName ?? "-"}</div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Status</span>
            <div className={``}><span className={`p-2 rounded-xl ${statusColorsPreorder[directSale.status]}`}>{directSale.status.toUpperCase()}</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Created At</span>
            <div>
              {formatDate(directSale.createdAt)}{" "}
              {formatTime(directSale.createdAt)}
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <span className="font-semibold">Payment Status</span>
            <div className={``}><span className={`p-2 rounded-xl ${statusColorsPayment[directSale.paymentStatus]}`}>{directSale.paymentStatus.toUpperCase()}</span></div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="max-h-[40vh] overflow-y-auto rounded-xl shadow-xl">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">SKU</th>
                <th className="p-2">UPC</th>
                <th className="p-2 text-center">Ordered Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedProducts.map((p: any) => {
                const unitPrice =
                  p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0;
                  const ordered = p.quantity ?? 0;
                  totalQty += ordered;
                return (
                  <tr key={p._id} className={`border-t`}>
                    <td className="p-2 capitalize">
                      {p.product?.brand?.name?.toLowerCase()}
                    </td>
                    <td className="p-2 capitalize">
                      {p.product?.name?.toLowerCase()} {p.product?.weight && (`${p.product?.weight}${p.product?.unit?.toUpperCase()}`)}
                    </td>
                    <td className="p-2">
                      {p.product?.sku}
                    </td>
                    <td className="p-2">
                      {p.product?.upc}
                    </td>
                    <td className="p-2 text-center">
                      {Math.round(ordered)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="p-2 text-right font-bold">
                      {formatCurrency(ordered * unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end text-2xl font-semibold">
          Total Units: {totalQty}
        </div>
        {/* TOTAL */}
        <div className="flex justify-end text-2xl font-semibold">
          Total: {formatCurrency(directSale.total)}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={() => generateDirectSalePDF(directSale)}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl cursor-pointer"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="bg-gray-300 px-5 py-3 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
