"use client";

import { useState } from "react";

export default function CancelCreditMemoModal({
  creditMemo,
  onClose,
  onConfirm,
}: {
  creditMemo: any;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        {/* HEADER */}
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          Cancel Credit Memo
        </h2>

        {/* INFO */}
        <div className="mb-4 text-sm">
          <div>
            <strong>Credit Memo #:</strong> {creditMemo.number}
          </div>
          <div>
            <strong>Client:</strong> {creditMemo.client?.clientName}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <span className="capitalize">{creditMemo.status}</span>
          </div>
        </div>

        {/* WARNING */}
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          This action cannot be undone. The credit memo will be permanently
          marked as <strong>cancelled</strong>.
        </div>

        {/* REASON */}
        <label className="block text-sm font-medium mb-1">
          Cancellation Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain why this credit memo is being cancelled"
          className="w-full border rounded-lg p-3 mb-4"
        />

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Close
          </button>

          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50"
          >
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}