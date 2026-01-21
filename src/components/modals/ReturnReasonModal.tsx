"use client";

import { useMemo, useState } from "react";
export default function ReturnReasonModal({
  products,
  onConfirm,
  onCancel,
}: {
  products: any[];
  onConfirm: (updatedProducts: any[]) => void;
  onCancel: () => void;
}) {
    const [localProducts, setLocalProducts] = useState(products);

  const updateReason = (productId: string, reason: string) => {
    setLocalProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, returnReason: reason }
          : p
      )
    );
  };

  const allValid = useMemo(() => {
    return localProducts
    .filter((p) => p.quantity > 0)
    .every((p) => p.returnReason);
  }, [localProducts]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl">
        <h2 className="text-xl font-semibold text-center mb-4">
          Select Return Reason
        </h2>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {localProducts
            .filter((p) => p.quantity > 0)
            .map((p) => (
              <div
                key={p.productId}
                className="flex justify-between items-center gap-4 border-b pb-3"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-gray-500">
                    Qty: {p.quantity}
                  </p>
                </div>

                <select
                  value={p.returnReason || ""}
                  onChange={(e) =>
                    updateReason(p.productId, e.target.value)
                  }
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="">Select reason</option>
                  <option value="credit memo">Credit Memo</option>
                  <option value="good return">Good Return</option>
                  <option value="no cost">No Cost</option>
                </select>
              </div>
            ))}
        </div>

        <div className="flex justify-between gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-gray-300"
          >
            Cancel
          </button>
          <button
            disabled={!allValid}
            onClick={() => onConfirm(localProducts)}
            className={`px-4 py-2 rounded-xl text-white font-semibold ${
              allValid
                ? "bg-blue-600 hover:bg-blue-700"
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
