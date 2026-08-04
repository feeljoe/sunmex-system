"use client";

import { formatCurrency } from "@/utils/format";
import { generateDirectSalePDF } from "@/utils/generateDirectSalePDF";
import { useRouter } from "next/navigation";

export default function DirectSaleDetailsModal({
  directSale,
  onClose,
  userRole,
}: {
  directSale: any;
  onClose: () => void;
  userRole: string;
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
  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "-";

  const isAdmin = userRole === "admin";

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
      <div className={`bg-(--secondary) font-mono rounded-xl shadow-xl ${isAdmin ? "w-full lg:max-w-5xl" : "w-[95vw]"} max-h-[90vh] overflow-auto`}>
        {/* HEADER */}
        <div className="flex p-2 bg-(--tertiary) justify-between items-center mb-2">
          <h2 className="text-sm lg:text-2xl font-semibold">
            Direct Sale Details for #{directSale.number}
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
        <h2 className={`font-semibold text-center ${isAdmin ? "text-xl" : "text-md"}`}>
          {directSale.client?.clientName}
        </h2>
        <h3 className={`text-center mb-4 ${!isAdmin ? "text-xs" : ""}`}>Address: {directSale.client?.billingAddress?.addressLine}, {directSale.client?.billingAddress?.city}, {directSale.client?.billingAddress?.state}, {directSale.client?.billingAddress?.country}, {directSale.client?.billingAddress?.zipCode} </h3>

        {/* META INFO */}
        {isAdmin && (
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
        )}
        {directSale.status === "cancelled" && (
          <div className="p-2 m-2 bg-red-400 text-red-800 rounded-xl font-bold hover:text-white transition-colors duration:500">
            <p>Cancel reason:</p>
            <p className="underline">{directSale.cancelReason}</p>
          </div>
        )}

        {/* PRODUCTS TABLE */}
        <div className="max-h-[52vh] ml-2 mr-2 overflow-y-auto rounded-xl shadow-xl">
          <table className={`w-full text-left ${isAdmin ? "" : "text-xs"}`}>
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">SKU</th>
                <th className="p-2">UPC</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Total</th>
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
        <div className="flex justify-between p-2">
          <button
            hidden={userRole !== "admin"}
            disabled={directSale.status === "cancelled"}
            onClick={() => router.push(`/pages/sales/direct-sales/edit/${directSale._id}`)}
            className={`font-bold p-2 w-20 rounded-xl transition-colors duration:500 ${directSale.status === "cancelled"
                ? "bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed"
                : "bg-yellow-400 text-yellow-800 cursor-pointer hover:bg-yellow-800 hover:text-white transition-colors duration:500"
              }`}
          >
            Edit
          </button>

          <button
            onClick={() => generateDirectSalePDF(directSale)}
            className="font-bold bg-blue-400 text-blue-800 p-2 w-20 rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-colors duration:500"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="font-bold bg-gray-300 text-gray-700 hover:bg-gray-600 hover:text-white p-2 w-20 rounded-xl cursor-pointer transition-colors duration:500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
