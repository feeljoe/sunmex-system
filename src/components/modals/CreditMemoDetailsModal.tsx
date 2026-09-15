"use client";

import { calculateDynamicTotal } from "@/utils/calculatePreorderDynamicTotal";
import { formatCurrency } from "@/utils/format";
import { generateCreditMemoPDF } from "@/utils/generateCreditMemoPDF";
import { useRouter } from "next/navigation";

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

export default function CreditMemoDetailsModal({
  creditMemo,
  onClose,
  onEdit,
  userRole,
}: {
  creditMemo: any;
  onClose: () => void;
  onEdit?: (preorder: any) => void;
  userRole?: string;
}) {
  const statusColorsCreditMemo: Record<string, string> = {
    pending: "bg-gray-300",
    received: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString("en-US", {
      day:"2-digit",
      month:"2-digit",
      year:"numeric"
    }) : "-";

  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "-";

  let totalQty = 0;
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-(--secondary) font-mono rounded-xl shadow-xl ${userRole === "admin" ? "w-full lg:max-w-6xl" : "w-[95vw]"} max-h-[90vh] overflow-auto`}>

        {/* HEADER */}
        <div className="flex p-2 bg-(--tertiary) justify-between items-center mb-2">
          <h2 className="text-sm lg:text-2xl font-semibold">

            Credit Memo details for #{creditMemo.number}
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

        <h2 className={`font-semibold text-center ${userRole === "admin" ? "text-xl" : "text-md"}`}>
          {creditMemo.client?.clientName}
        </h2>
        <h3 className={`text-center mb-4 ${userRole !== "admin" ? "text-xs" : ""}`}>{creditMemo.client?.billingAddress?.addressLine}, {creditMemo.client?.billingAddress?.city}, {creditMemo.client?.billingAddress?.state}, {creditMemo.client?.billingAddress?.zipCode} </h3>


        {/* HEADER INFO */}
        {userRole === "admin" && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm text-center">
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Route</span>
              <div>{creditMemo.routeAssigned?.code ?? "-"}</div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Status</span>
              <div className={``}><span className={`p-2 rounded-xl font-bold ${statusColorsCreditMemo[creditMemo.status]}`}>{creditMemo.status.toUpperCase()}</span></div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Created By</span>
              <div>
                {creditMemo.createdBy?.firstName}{" "}
                {creditMemo.createdBy?.lastName}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Created At</span>
              <div>
                {formatDate(creditMemo.createdAt)}{" "}
                {formatTime(creditMemo.createdAt)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Returned At</span>
              {creditMemo.returnedAt ? (
              <div>
                {formatDate(creditMemo.returnedAt)}{" "}
                {formatTime(creditMemo.returnedAt)}
              </div>
            ): (
              <div>
                {"-"}
              </div>
            )}
            </div>
          </div>
        )}
        {creditMemo.status === "cancelled" && (
          <div className="p-2 m-2 bg-red-400 text-red-800 rounded-xl font-bold hover:text-white transition-colors duration:500">
            <p>Cancel reason:</p>
            <p className="underline">{creditMemo.cancelReason}</p>
          </div>
        )}

        {/* PRODUCTS TABLE */}
        <div className="max-h-[52vh] ml-2 mr-2 mt-4 overflow-y-auto rounded-xl shadow-xl">
          <table className={`w-full text-sm overflow-auto ${userRole === "admin" ? "" : "text-xs"}`}>
            <thead className="bg-(--tertiary)">
              <tr className="border-b">
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-left">Product</th>
                {userRole === "admin" ? (
                  <>
                  <th className="p-2 text-center">SKU</th>
                <th className="p-2 text-center">UPC</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Picked</th>
                <th className="p-2 text-center">Returned</th>
                  </>
                ): (
                  <th className="p-2 text-center">Qty</th>
                )}
                
                <th className="p-2 text-center">Cost</th>
                <th className="px-4 py-2 text-center">Reason</th>
                <th colSpan={2} className="px-4 py-2 text-center">Condition & Exp. Date</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {creditMemo.products.map((p: any, idx: number) => {
                const productFullName = `${p.product?.name?.toLowerCase() || "-"} ${(p.product?.weight && p.product?.unit) ? p.product?.weight + p.product?.unit?.toUpperCase() : ""}`; 3
                const productChunks = chunkTextByWords(productFullName, 14);
                totalQty += creditMemo.status === "received" ? p.pickedQuantity : p.quantity;
                return (
                  <tr key={idx} className="border-b">
                    <td className="p-2 capitalize whitespace-nowrap">
                      {p.product?.brand?.name?.toLowerCase() || "-"}
                    </td>
                    <td className="p-2 capitalize whitespace-nowrap">
                      {productChunks.map((chunk, index) => (
                        <span key={index} className="block leading-tight whitespace-nowrap">
                          {chunk}
                        </span>
                      ))}
                    </td>
                    {userRole === "admin" ? (
                      <>
                      <td className="p-2 text-center whitespace-nowrap">
                      {p.product?.sku ||
                        "-"}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      {p.product?.upc ||
                        "-"}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">{p.quantity}</td>
                    <td className="p-2 text-center whitespace-nowrap">{p.pickedQuantity ?? "0"}</td>
                    <td className="p-2 text-center whitespace-nowrap">{p.returnedQuantity ?? "0"}</td>
                      </>
                    ): (
                      <td className="p-2 text-center whitespace-nowrap">{p.quantity}</td>
                    )}
                    <td className="p-2 text-center whitespace-nowrap">
                      {formatCurrency(p.actualCost)}
                    </td>
                    <td className="p-2 text-center capitalize whitespace-nowrap">
                      <span className={`px-1 py-2 font-bold rounded-xl ${p.returnReason === "credit memo" ? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>{p.returnReason}</span>
                    </td>
                    {(p.condition && p.expirationDate) ? (
                      <>
                        <td className="p-2 text-center capitalize whitespace-nowrap">
                          <span className={`px-1 py-2 font-bold rounded-xl ${(p.condition === "damaged" || p.condition === "expired") ? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>{p.condition}</span>
                        </td>
                        <td className="p-2 text-center capitalize whitespace-nowrap">
                          <span className={`px-1 py-2 font-bold rounded-xl ${(p.condition === "damaged" || p.condition === "expired") ? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>{formatDate(p.expirationDate)}</span>
                        </td>
                      </>
                    ): p.condition ? (
                      <td colSpan={2} className="p-2 text-center capitalize whitespace-nowrap">
                          <span className={`px-1 py-2 font-bold rounded-xl ${(p.condition === "damaged" || p.condition === "expired") ? "bg-red-400 text-red-800" : "bg-green-400 text-green-800"}`}>{p.condition}</span>
                        </td>
                    ): (
                      <td colSpan={2} className="p-2 text-center capitalize whitespace-nowrap">
                          -
                      </td>
                    )}
                    
                  </tr>
                );
              }
              )}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className={`flex justify-end font-semibold mt-2 mr-2 ${userRole === "admin" ? "text-2xl" : "text-lg"}`}>
                  {creditMemo.status === "cancelled" ? `Total Units: N/A` : `Total Units: ${totalQty}`}
                </div>
                <div className={`flex justify-end font-semibold mt-2 mb-2 mr-2 ${userRole === "admin" ? "text-2xl" : "text-lg"}`}>
                  {`${creditMemo.status === "cancelled" ? "Total" : creditMemo.status !== "received" ? "Subtotal:" : "Total:"} ${creditMemo.status === "cancelled" ? "N/A" : formatCurrency(calculateDynamicTotal(creditMemo))}`}
                </div>
        {/* ACTIONS */}
        <div className="flex justify-between p-2">
          <button
            disabled={creditMemo.status !== "pending" && userRole !== "admin"}
            onClick={() => router.push(`/pages/sales/creditmemo/edit/${creditMemo._id}`)}
            className={`font-bold bg-yellow-400 text-yellow-800 p-2 w-20 rounded-xl cursor-pointer ${(creditMemo.status !== "pending" && userRole !== "admin") ? "opacity-50" : ""} hover:bg-yellow-800 hover:text-white transition-colors duration:500`}>
            Edit
          </button>
          <button
            onClick={() => generateCreditMemoPDF(creditMemo)}
            className="font-bold bg-blue-400 text-blue-800 p-2 w-20 rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-colors duration:500"
          >
            PDF
          </button>

          <button
            onClick={onClose}
            className="font-bold bg-gray-300 text-gray-700 p-2 w-20 rounded-xl cursor-pointer hover:bg-gray-700 hover:text-white transition-colors duration:500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
