"use client";

import { calculateDynamicTotal } from "@/utils/calculatePreorderDynamicTotal";
import { generatePreorderPDF } from "@/utils/generatePreorderPDF";
import { useRouter } from "next/navigation";
export default function PreorderDetailsModal({
  preorder,
  onClose,
  onEdit,
  userRole,
}: {
  preorder: any;
  onClose: () => void;
  onEdit: (preorder: any) => void;
  userRole: string;
}) {
  /* -----------------------------
     HELPERS
  ------------------------------*/
  const statusColorsPreorder: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    assigned: "bg-(--tertiary) text-(--quaterary)",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  }; 
  const statusColorsPayment: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    paid: "bg-green-400 text-green-800",
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
  let totalQty = 0;
  const router = useRouter();

  /* =============================
     RENDER
  ==============================*/
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-2xl p-6 lg:max-w-5xl max-h-[90vh] overflow-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center py-2 mb-4 border-b">
          <h2 className="lg:text-2xl font-semibold">
            Preorder Details for #{preorder?.number}
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h2 className="text-xl font-semibold text-center">
            {preorder.client?.clientName}
          </h2>
        <h3 className="text-center mb-4">Address: {preorder.client?.billingAddress?.addressLine}, {preorder.client?.billingAddress?.city}, {preorder.client?.billingAddress?.state}, {preorder.client?.billingAddress?.country}, {preorder.client?.billingAddress?.zipCode} </h3>

        {/* META INFO */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm text-center">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Route</span>
            <div>{preorder.routeAssigned?.code ?? "-"}</div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Status</span>
            <div className={``}><span className={`p-2 rounded-xl font-bold ${statusColorsPreorder[preorder.status]}`}>{preorder.status.toUpperCase()}</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Type</span>
            <div><span className={`p-2 rounded-xl font-bold ${preorder.type === "noCharge"? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>{preorder.type === "charge"? "CHARGE" : preorder.type === "noCharge"?"NO CHARGE": "-"}</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Created At</span>
            <div>
              {formatDate(preorder.createdAt)}{" "}
              {formatTime(preorder.createdAt)}
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <span className="font-semibold">Payment Status</span>
            <div className={``}><span className={`p-2 rounded-xl font-bold ${statusColorsPayment[preorder.paymentStatus]}`}>{preorder.paymentStatus.toUpperCase()}</span></div>
          </div>
        </div>
        {preorder.status === "cancelled" && (
          <div className="w-full p-2 mt-2 mb-2 bg-red-400 text-red-800 rounded-xl font-bold hover:text-white transition-colors duration:500">
            <p>Cancel reason:</p>
            <p className="underline">{preorder.cancelReason}</p>
          </div>
        )}

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
                <th className="p-2 text-center">Picked Qty</th>
                <th className="p-2 text-center">Delivered Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedProducts.map((p: any) => {
                const unitPrice =
                  p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0;
                  const picked = p.pickedQuantity ?? 0;
                  const ordered = p.quantity ?? 0;
                  const delivered = p.deliveredQuantity ?? 0;

                  const isDifferent = (picked !== ordered && preorder.status === "ready") || ((delivered !== picked || delivered !== ordered) && preorder.status === "delivered");
                  
                  totalQty += preorder.status === "delivered" ? delivered : preorder.status === "ready" ? picked : ordered;
                return (
                  <tr key={p.productInventory?._id} className={`border-t ${isDifferent ? "bg-yellow-50" : ""}`}>
                    <td className="p-2 capitalize">
                      {p.productInventory?.product?.brand?.name.toLowerCase()}
                    </td>
                    <td className="p-2 capitalize">
                      {p.productInventory?.product?.name.toLowerCase()} {p.productInventory?.product?.weight && (`${p.productInventory?.product?.weight}${p.productInventory?.product?.unit?.toUpperCase()}`)}
                    </td>
                    <td className="p-2">
                      {p.productInventory?.product?.sku}
                    </td>
                    <td className="p-2">
                      {p.productInventory?.product?.upc}
                    </td>
                    <td className="p-2 text-center">
                      {Math.round(ordered)}
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${
                        picked === 0
                          ? "text-red-600"
                          : picked !== ordered
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.round(picked)}
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${
                        delivered === 0
                          ? "text-red-600"
                          : delivered < picked
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.round(delivered)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="p-2 text-right font-bold">
                      {formatCurrency(preorder.status === "delivered" ? delivered * unitPrice : preorder.status === "ready" ? picked * unitPrice : ordered * unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end text-2xl font-semibold mt-2">
          {preorder.status === "cancelled" ? `Total Units: N/A` : `Total Units: ${totalQty}`}
        </div>
        <div className="flex justify-end text-2xl font-semibold mt-2 mb-2">
          {`${preorder.status === "cancelled" ? "Total" : preorder.status !== "delivered" ? "Subtotal:" : "Total:"} ${preorder.status === "cancelled" ? "N/A" : formatCurrency(calculateDynamicTotal(preorder))}`}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between pt-4 border-t">
          <button
            disabled={preorder.paymentStatus === "paid" || preorder.status === "cancelled"}
            onClick={() => router.push(`/pages/sales/preorders/edit/${preorder._id}`)}
            className={`bg-yellow-400 text-yellow-800 font-bold px-5 py-3 rounded-xl ${(preorder.paymentStatus === "paid" || preorder.status === "cancelled") ? "opacity-50": "cursor-pointer hover:text-white hover:bg-yellow-800 transition-colors duration:500"}`}>
              Edit
            </button>
          <button
            onClick={() => generatePreorderPDF(preorder)}
            className="bg-blue-400 text-blue-800 font-bold px-5 py-3 rounded-xl cursor-pointer hover:text-white hover:bg-blue-800 transition-colors duration:500"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="bg-gray-400 text-gray-800 font-bold px-5 py-3 rounded-xl cursor-pointer hover:text-white hover:bg-gray-800 transition-colors duration:500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
