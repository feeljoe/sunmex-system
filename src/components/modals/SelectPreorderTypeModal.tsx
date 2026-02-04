"use client";

import { useMemo, useState } from "react";
export default function SelectPreorderTypeModal({
  client,
  onConfirm,
  onCancel,
}: {
  client: any;
  onConfirm: (reason: string, type: string) => void;
  onCancel: () => void;
}) {

  const [reason, updateReason] = useState("");
  const [type, setType] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-(--secondary) flex flex-col rounded-xl shadow-xl p-6 w-full max-w-xl">
        <h2 className="text-xl font-semibold text-center mb-4">
          Preorder Type
        </h2>
        <h3 className="font-bold text-lg p-2"> Select Preorder Type</h3>

        <select
            className="shadow-xl h-10 bg-white text-lg"
            onChange={(e) => setType(e.target.value)}>
            <option value="">Select One</option>
            <option value="charge">Charge</option>
            <option value="noCharge">No Charge</option>
        </select>

        {type === "noCharge" &&
        <>
            <h3 className="font-bold text-red-600 p-2 py-4 text-center">
                Please type No Charge Reason for client: {client?.clientName}
            </h3>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                <textarea
                    value={reason}
                    onChange={(e) =>
                        updateReason(e.target.value)
                    }
                    rows={4}
                    placeholder="Reason for NO CHARGE (required)"
                    className="bg-white p-3 w-full h-full rounded-xl resize-none"
                >
                </textarea>
            </div>
        </>
        }
        <div className="flex justify-between gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-gray-300 cursor-pointer hover:bg-gray-200 transition-all duration:500"
          >
            Cancel
          </button>
          <button
            disabled={(!reason || reason.length === 0) && type ==="noCharge"}
            onClick={() => onConfirm(reason, type)}
            className={`px-4 py-2 rounded-xl text-white font-semibold transition-all duration:500
                ${ reason || type === "charge"
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-100"
                }
            `}
          >
            Confirm
          </button>
        </div>
      </div>
      </div>
  );
}
