"use client";

export default function BulkAssignConfirmModal({
  count,
  routeLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  routeLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 w-96 text-center">
        <h2 className="text-xl font-semibold mb-4">
          Confirm Bulk Assignment
        </h2>

        <p className="mb-6">
          You are about to assign{" "}
          <span className="font-bold">{count}</span>{" "}
          preorders to route:
          <br />
          <span className="font-bold">{routeLabel}</span>
        </p>

        <div className="flex justify-between">
          <button
            className="px-4 py-2 bg-gray-300 rounded-xl"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-xl"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Assigning..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}