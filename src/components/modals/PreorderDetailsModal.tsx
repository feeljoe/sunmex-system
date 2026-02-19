"use client";

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
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-2xl lg:max-w-5xl p-2 space-y-2">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">
            Preorder Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-2xl cursor-pointer"
          >
            ✕
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
            <div className={``}><span className={`p-2 rounded-xl ${statusColorsPreorder[preorder.status]}`}>{preorder.status.toUpperCase()}</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Type</span>
            <div><span className={`p-2 rounded-xl text-white ${preorder.type === "noCharge"? "bg-red-600" : "bg-green-600"}`}>{preorder.type === "charge"? "CHARGE" : preorder.type === "noCharge"?"NO CHARGE": "-"}</span></div>
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
            <div className={``}><span className={`p-2 rounded-xl ${statusColorsPayment[preorder.paymentStatus]}`}>{preorder.paymentStatus.toUpperCase()}</span></div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="max-h-[40vh] overflow-y-auto rounded-xl shadow-xl">
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
            <tbody className="bg-white">
              {sortedProducts.map((p: any) => {
                const unitPrice =
                  p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0;
                  totalQty += p.quantity;

                return (
                  <tr key={p.productInventory?._id} className="border-t">
                    <td className="p-2 capitalize">
                      {p.productInventory?.product?.brand?.name.toLowerCase()}
                    </td>
                    <td className="p-2 capitalize">
                      {p.productInventory?.product?.name.toLowerCase()}
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
                    <td className="p-2 text-right font-bold">
                      {formatCurrency(p.quantity * unitPrice)}
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
        {(preorder.total ===0 && preorder.subtotal >= 0) &&
        <div className="flex justify-end text-2xl font-semibold">
          Subtotal: {formatCurrency(preorder.subtotal)}
        </div>
        }
        {/* TOTAL */}
        {(preorder.total >= 0 && preorder.status === "delivered") &&
        <div className="flex justify-end text-2xl font-semibold">
          Total: {formatCurrency(preorder.total)}
        </div>
        }

        {/* ACTIONS */}
        <div className="flex justify-between pt-4 border-t">
          <button
          disabled={preorder.status !== "pending" && userRole !== "admin"}
            onClick={() => router.push(`/pages/sales/preorders/edit/${preorder._id}`)}
            className={`bg-yellow-500 text-white px-5 py-3 rounded-xl cursor-pointer ${(preorder.status !== "pending" && userRole !== "admin") ? "opacity-50": ""}`}>
              Edit
            </button>
          <button
            onClick={() => generatePreorderPDF(preorder)}
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
