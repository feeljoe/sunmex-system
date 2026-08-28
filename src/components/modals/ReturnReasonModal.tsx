"use client";

import { useMemo, useState, useEffect } from "react";
import { SingleDatePicker } from "../ui/SingleDatePicker";

export default function ReturnReasonModal({
  products,
  onConfirm,
  onCancel,
}: {
  products: any[];
  onConfirm: (updatedProducts: any[]) => void;
  onCancel: () => void;
}) {
  const [localProducts, setLocalProducts] = useState(
    products.map((p) => ({
      ...p,
      returnReason: p.returnReason || "credit memo",
      condition: p.condition || "", 
      expirationDate: p.expirationDate
        ? new Date(p.expirationDate).toISOString().split('T')[0] 
        : "",
    }))
  );

  // SAFEGUARD: Force React to strictly sync the incoming edit data
  useEffect(() => {
    setLocalProducts(
      products.map((p) => ({
        ...p,
        returnReason: p.returnReason || "credit memo",
        condition: p.condition || "",
        expirationDate: p.expirationDate
          ? new Date(p.expirationDate).toISOString().split('T')[0]
          : "",
      }))
    );
  }, [products]);

  const updateField = (productId: string, field: string, value: string) => {
    setLocalProducts((prev) =>
      prev.map((p) => {
        if (p.productId === productId) {
          const updated = { ...p, [field]: value };

          // Smart reset logic when they change the main reason
          if (field === "returnReason") {
            if (value === "good return") {
              updated.condition = "good";
            } else {
              updated.condition = ""; // Force them to choose damaged or expired
              updated.expirationDate = "";
            }
          }

          // Clear date if they switch from expired to damaged
          if (field === "condition" && value === "damaged") {
            updated.expirationDate = "";
          }

          return updated;
        }
        return p;
      })
    );
  };

  // 1. Filter to only the active products we care about
  const activeProducts = useMemo(() => localProducts.filter((p) => p.quantity > 0), [localProducts]);

  // 2. Count exactly how many have passed validation
  const completedItemsCount = useMemo(() => {
    return activeProducts.filter((p) => {
      if (!p.returnReason) return false;
      if (p.returnReason === "credit memo") {
        if (!p.condition) return false;
        if (p.condition === "expired" && !p.expirationDate) return false;
      }
      if (p.returnReason === "good return") {
        if (!p.expirationDate) return false;
      }
      return true;
    }).length;
  }, [activeProducts]);

  // 3. Calculate percentage and final validation
  const totalItems = activeProducts.length;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItemsCount / totalItems) * 100);
  const allValid = completedItemsCount === totalItems && totalItems > 0;

  const getProgressBarColor = (percent: number) => {
    if (percent <= 33) return "bg-red-500";
    if (percent <= 75) return "bg-orange-500";
    if (percent <= 99) return "bg-yellow-400";
    return "bg-green-500";
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-xl shadow-xl p-4 w-[95vw] max-w-2xl">
        <h2 className="text-xl font-semibold text-center mb-4">
          Select Return Details
        </h2>

        <div className="w-full mb-4 px-2">
          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 font-mono uppercase tracking-wider">
            <span>Progress</span>
            <span className={allValid ? "text-green-600" : ""}>
              {completedItemsCount} / {totalItems} Completed
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-500 ease-out ${getProgressBarColor(progressPercentage)}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {localProducts
            .filter((p) => p.quantity > 0)
            .map((p) => (
              <div
                key={p.productId}
                className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-2 rounded-xl shadow-xl"
              >
                <div className="sm:w-1/3">
                  <p className="capitalize font-medium">
                    {p.brand?.toLowerCase()} {p.name.toLowerCase()}{" "}
                    {p.weight ? p.weight + p.unit?.toUpperCase() : ""}
                  </p>
                  <p className="text-sm text-gray-500 font-bold">Qty: {p.quantity}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:w-2/3 justify-end items-end sm:items-center">

                  {/* MAIN REASON SELECT */}
                  <div className="flex flex-col w-full sm:w-auto">
                    <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Return reason</span>
                    <select
                      value={p.returnReason || ""}
                      onChange={(e) => updateField(p.productId, "returnReason", e.target.value)}
                      className="bg-gray-100 h-10 rounded-xl p-2 text-sm w-full sm:w-auto outline-none cursor-pointer"
                    >
                      <option value="credit memo">Credit Memo</option>
                      <option value="good return">Good Return</option>
                    </select>
                  </div>
                  {/* CONDITION SELECT (Only for Credit Memos) */}

                  {p.returnReason === "credit memo" && (
                    <div className="flex flex-col w-full sm:w-auto">
                      <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Condition</span>
                      <select
                        value={p.condition || ""}
                        onChange={(e) => updateField(p.productId, "condition", e.target.value)}
                        className={`rounded-xl h-10 p-2 text-sm w-full sm:w-auto outline-none cursor-pointer ${!p.condition ? 'bg-red-100' : 'bg-gray-100'}`}
                      >
                        <option value="" disabled>Condition...</option>
                        <option value="damaged">Damaged</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  )}

                  {/* EXPIRATION DATE (For Good Returns OR Expired Credit Memos) */}
                  {(p.returnReason === "good return" || p.condition === "expired") && (
                    <div className="flex flex-col w-full sm:w-auto">
                      <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Exp. Date</span>
                      <SingleDatePicker
                        value={p.expirationDate || ""}
                        onChange={(val) => updateField(p.productId, "expirationDate", val)}
                        hasError={!p.expirationDate}
                        reason={p.returnReason}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!allValid}
            onClick={() => onConfirm(localProducts)}
            className={`px-6 py-2 rounded-xl text-white font-bold transition-colors ${allValid
              ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              : "bg-blue-200 cursor-not-allowed"
              }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}