"use client";

import { calculateDynamicTotal } from "@/utils/calculatePreorderDynamicTotal";
import { formatCurrency } from "@/utils/format";
import { generatePreorderPDF } from "@/utils/generatePreorderPDF";
import { useRouter } from "next/navigation";
import { useState } from "react";

const chunkTextByWords = (text: string, maxLength: number) => {
  if (!text) return [];

  const words = text.split(" ");
  const chunks = [];
  let currentLine = "";

  words.forEach((word) => {
    // If adding this next word pushes us over 12 chars, 
    // save the current line and start a new one.
    if ((currentLine + word).length > maxLength && currentLine !== "") {
      chunks.push(currentLine.trim());
      currentLine = "";
    }
    currentLine += word + " ";
  });

  // Don't forget to push the very last chunk!
  if (currentLine) {
    chunks.push(currentLine.trim());
  }

  return chunks;
};
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

  const [isLocationHovered, setIsLocationHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsLocationHovered(true);
    }, 300);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsLocationHovered(false);
  };

  /* =============================
     RENDER
  ==============================*/
  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div
        onClick={(e) => e.stopPropagation()} 
        className={`bg-(--secondary) font-mono rounded-xl shadow-xl w-[95vw] ${userRole === "admin" ? "lg:max-w-6xl" : ""} max-h-[95vh] overflow-auto`}>

        {/* HEADER */}
        <div className="flex p-2 bg-(--tertiary) justify-between items-center mb-2">
          <h2 className="text-sm lg:text-2xl font-semibold">
            Preorder Details for #{preorder?.number}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h2 className={`font-semibold text-center text-md md:text-xl`}>
          {preorder.client?.clientName}
        </h2>
        <h3 className={`flex flex-col text-center mb-2 text-xs md:text-[14px] text-gray-500 px-2`}>
          <span>{preorder.client?.billingAddress?.addressLine}, </span>
          <span>{preorder.client?.billingAddress?.city}, {preorder.client?.billingAddress?.state}, {preorder.client?.billingAddress?.country}, {preorder.client?.billingAddress?.zipCode}</span> </h3>

        {/* META INFO */}
        {userRole === "admin" && (
          <div className="flex flex-wrap gap-2 justify-around items-center text-xs md:text-[14px] text-center p-2">
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Route</span>
              <span className="p-2">{preorder.routeAssigned?.code ?? "-"}</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Status</span>
              <span className={`p-2 rounded-xl font-bold ${statusColorsPreorder[preorder.status]}`}>{preorder.status.toUpperCase()}</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Type</span>
              <span className={`p-2 rounded-xl font-bold ${preorder.type === "noCharge" ? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>
                {`${preorder.type === "noCharge" ? "NO CHARGE" : preorder.type ? preorder.type?.toUpperCase() : "-"}`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Created At</span>
              <div className="p-2">
                {formatDate(preorder.createdAt)}{" "}
                {formatTime(preorder.createdAt)}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Payment Status</span>
              <span className={`p-2 rounded-xl font-bold ${statusColorsPayment[preorder.paymentStatus]}`}>
                {preorder.paymentStatus.toUpperCase()}
              </span>
            </div>

            {preorder.location && (
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Location</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${preorder.location.latitude},${preorder.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className="md:w-48 group p-2 rounded-xl font-bold text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-500 ease-in-out cursor-pointer justify-center items-center"
                >
                  <span className="">
                    {isLocationHovered
                      ? "Check Location"
                      : `${preorder.location.latitude.toFixed(5)}, 
                        ${preorder.location.longitude.toFixed(5)}`
                    }
                  </span>
                </a>
              </div>
            )}
          </div>
        )}
        {preorder.status === "cancelled" && (
          <div className="p-2 m-2 bg-red-400 text-red-800 rounded-xl font-bold hover:text-white transition-colors duration:500">
            <p>Cancel reason:</p>
            <p className="underline">{preorder.cancelReason}</p>
          </div>
        )}

        {/* PRODUCTS TABLE */}
        <div className="max-h-[37vh] md:max-h-[50vh] ml-2 mr-2 overflow-y-auto rounded-xl shadow-xl">
          <table className={`w-full text-left text-xs md:text-[16px]`}>
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr className="whitespace-nowrap">
                <th className="p-2">Brand</th>
                <th className="p-2 ">Product</th>
                {userRole === "admin" ? (
                  <>
                    <th className="p-2">SKU</th>
                    <th className="p-2">UPC</th>
                    <th className="p-2 text-center">Ordered Qty</th>
                    <th className="p-2 text-center">Picked Qty</th>
                    <th className="p-2 text-center">Delivered Qty</th>
                  </>
                ) : (
                  <th className="p-2 text-center">QTY</th>
                )}
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Total</th>
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
                // 1. Safely construct the full string
                const productFullName = `${p.productInventory?.product?.name?.toLowerCase() || ""} ${p.productInventory?.product?.weight || ""}${p.productInventory?.product?.unit?.toUpperCase() || ""}`.trim();

                // 2. Split into exact 12-character chunks
                const productChunks = chunkTextByWords(productFullName, 14);

                totalQty += preorder.status === "delivered" ? delivered : preorder.status === "ready" ? picked : ordered;
                return (
                  <tr key={p.productInventory?._id} className={`border-t ${isDifferent ? "bg-yellow-50" : ""}`}>
                    <td className="p-2 capitalize">
                      {p.productInventory?.product?.brand?.name?.toLowerCase()}
                    </td>
                    <td className="p-2 capitalize">
                      {productChunks.map((chunk, index) => (
                        <span key={index} className="block leading-tight whitespace-nowrap">
                          {chunk}
                        </span>
                      ))}
                    </td>
                    {userRole === "admin" ? (
                      <>
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
                          className={`p-2 text-center font-bold ${picked === 0
                            ? "text-red-600"
                            : picked !== ordered
                              ? "text-orange-600"
                              : "text-green-600"
                            }`}
                        >
                          {Math.round(picked)}
                        </td>
                        <td
                          className={`p-2 text-center font-bold ${delivered === 0
                            ? "text-red-600"
                            : delivered < picked
                              ? "text-orange-600"
                              : "text-green-600"
                            }`}
                        >
                          {Math.round(delivered)}
                        </td>
                      </>
                    ) : (
                      <td className="p-2 text-center">
                        {Math.round(ordered)}
                      </td>
                    )}
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

        <div className={`flex justify-end font-semibold mt-2 mr-2 text-lg md:text-2xl`}>
          {preorder.status === "cancelled" ? `Total Units: N/A` : `Total Units: ${totalQty}`}
        </div>
        <div className={`flex justify-end font-semibold mt-2 mb-2 mr-2 text-lg md:text-2xl`}>
          {`${preorder.status === "cancelled" ? "Total" : preorder.status !== "delivered" ? "Subtotal:" : "Total:"} ${preorder.status === "cancelled" ? "N/A" : formatCurrency(calculateDynamicTotal(preorder))}`}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between p-2">
          <button
            disabled={preorder.paymentStatus === "paid" || preorder.status === "cancelled"}
            onClick={() => router.push(`/pages/sales/preorders/edit/${preorder._id}`)}
            className={`bg-yellow-400 text-yellow-800 font-bold p-2 w-20 rounded-xl ${(preorder.paymentStatus === "paid" || preorder.status === "cancelled") ? "opacity-50" : "cursor-pointer hover:text-white hover:bg-yellow-800 transition-colors duration:500"}`}>
            Edit
          </button>
          <button
            onClick={() => generatePreorderPDF(preorder)}
            className="bg-blue-400 text-blue-800 font-bold p-2 w-20 rounded-xl cursor-pointer hover:text-white hover:bg-blue-800 transition-colors duration:500"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="bg-gray-400 text-gray-800 font-bold p-2 w-20 rounded-xl cursor-pointer hover:text-white hover:bg-gray-800 transition-colors duration:500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
