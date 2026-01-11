"use client";
import { useState } from "react";

export default function PreorderPaymentModal({
  preorder,
  onClose,
  onPaid,
}: {
  preorder: any;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<"cash" | "check" | "">(
    preorder.paymentMethod ?? ""
  );
  const [checkNumber, setCheckNumber] = useState(
    preorder.checkNumber?.toString() ?? ""
  );

  const submitPayment = async () => {
    await fetch(`/api/preOrders/${preorder._id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: method,
        checkNumber: method === "check" ? Number(checkNumber) : null,
      }),
    });

    onPaid();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-(--secondary) rounded-xl p-6 w-4/5 max-w-xl space-y-4">
        <h3 className="text-xl font-semibold text-center">Mark Order {preorder.client.clientName} as Paid</h3>

        <div>
          <label className="block font-medium mb-1">Payment Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as any)}
            className="bg-(--tertiary) rounded-xl shadow-xl h-10 p-2 w-full"
          >
            <option value="">Select</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
          </select>
        </div>

        {method === "check" && (
          <div>
            <label className="block font-medium mb-1">Check Number</label>
            <input
              type="number"
              inputMode="numeric"
              value={checkNumber}
              onChange={e => setCheckNumber(e.target.value)}
              className="bg-(--tertiary) rounded-xl shadow-xl h-10 p-2 w-full"
            />
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            disabled={!method || (method === "check" && !checkNumber)}
            onClick={submitPayment}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}
