"use client";

import { generatePreorderPDF } from "@/utils/generatePreorderPDF";
import { useRouter } from "next/navigation";
export default function LoadRequestDetailsModal({
  loadRequest,
  onClose,
}: {
  loadRequest: any;
  onClose: () => void;
}) {
  /* -----------------------------
     HELPERS
  ------------------------------*/
  const statusColorsPreorder: Record<string, string> = {
    pending: "bg-gray-300",
    assigned: "bg-(--tertiary)",
    approved: "bg-yellow-500 text-white",
    prepared: "bg-blue-500 text-white",
    delivered: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
    rejected: "bg-red-500 text-white",
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

  /* -----------------------------
     PRODUCTS (SORTED)
  ------------------------------*/
  const sortedProducts = [...(loadRequest.products ?? [])].sort((a: any, b: any) => {
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
  /* =============================
     RENDER
  ==============================*/
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-2xl lg:max-w-5xl p-2 space-y-2">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">
            Load Request Details for #{loadRequest?.LRNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-2xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* META INFO */}
        <div className="flex items-center justify-around mt-5 mb-5 gap-4 text-sm text-center">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Route</span>
            <div>{loadRequest.route?.code ?? "-"} | {loadRequest.route?.user?.firstName ?? "-"} {loadRequest.route?.user?.lastName ?? "-"}</div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Status</span>
            <div className={``}><span className={`p-2 rounded-xl ${statusColorsPreorder[loadRequest.status]}`}>{loadRequest.status?.toUpperCase()}</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Created At</span>
            <div>
              {formatDate(loadRequest.createdAt)}{" | "}
              {formatTime(loadRequest.createdAt)}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Last Updated At</span>
            <div>
              {formatDate(loadRequest.updatedAt)}{" | "}
              {formatTime(loadRequest.updatedAt)}
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="max-h-[40vh] overflow-y-auto rounded-xl shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">SKU</th>
                <th className="p-2">UPC</th>
                <th className="p-2 text-center">Requested Qty</th>
                <th className="p-2 text-center">Approved Qty</th>
                <th className="p-2 text-center">Assembled Qty</th>
                <th className="p-2 text-center">Delivered Qty</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedProducts.map((p: any) => {
                  const assembled = p.assembledQuantity ?? 0;
                  const requested = p.requestedQuantity ?? 0;
                  const approved = p.approvedQuantity ?? 0;
                  const delivered = p.deliveredQuantity ?? 0;

                  const isDifferent = (approved !== requested && loadRequest.status === "approved") || (approved !== assembled && loadRequest.status === "prepared") || ((assembled !== delivered) && loadRequest.status === "delivered");
                  
                  totalQty += loadRequest.status === "delivered" ? delivered : loadRequest.status === "prepared" ? assembled : loadRequest.status === "approved" ? approved : requested;
                return (
                  <tr key={p._id} className={`border-t ${isDifferent ? "bg-yellow-50" : ""}`}>
                    <td className="p-2 capitalize">
                      {p.product?.brand?.name.toLowerCase()}
                    </td>
                    <td className="p-2 capitalize">
                      {p.product?.name.toLowerCase()} {p.product?.weight && (`${p.product?.weight}${p.product?.unit?.toUpperCase()}`)}
                    </td>
                    <td className="p-2">
                      {p.product?.sku}
                    </td>
                    <td className="p-2">
                      {p.product?.upc}
                    </td>
                    <td className="p-2 text-center">
                      {Math.round(requested)}
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${
                        approved === 0
                          ? "text-red-600"
                          : approved !== requested
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.round(approved)}
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${
                        assembled === 0
                          ? "text-red-600"
                          : assembled < approved
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.round(assembled)}
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${
                        delivered === 0
                          ? "text-red-600"
                          : delivered < assembled
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.round(delivered)}
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

        {/* ACTIONS */}
        <div className="flex justify-between pt-4 border-t">
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