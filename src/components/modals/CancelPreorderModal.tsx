"use client";

import { useState } from "react";
export default function CancelPreorderModal({
    preorder,
    onClose,
    onConfirm,
}: {
    preorder: any;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">
              Cancel Preorder #{preorder.number}
            </h2>
            <h3 className="text-xl font-semibold text-red-600 text-center">
                <strong>for {preorder.client?.clientName}</strong>?
            </h3>
            <textarea 
                className="w-full shadow-xl rounded-xl p-2 resize-none"
                rows={4}
                placeholder="Reason for Cancellation (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}>

            </textarea>
    
            <p className="text-sm text-gray-500 text-center">
              This action will restore all reserved inventory and cannot be undone.
            </p>
    
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-500 transition-all duration:500 cursor-pointer"
              >
                No, go back
              </button>
    
              <button
                disabled={!reason.trim()}
                onClick={() => onConfirm(reason)}
                className="disabled:opacity-0 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration:500 cursor-pointer"
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      );
}