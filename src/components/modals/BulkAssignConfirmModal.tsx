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
    <div className="fixed inset-0 z-51 bg-black/50 flex items-center justify-center">
      <div className="flex flex-col justify-between bg-white rounded-xl shadow-xl p-2 w-100 h-60 text-center">
        <h2 className="text-xl font-semibold border-b-2">
          Confirm Bulk Assignment
        </h2>

        <p className="">
          You are about to assign{" "}
          <span className="font-bold">{count}</span>{" "}
          preorders to route:
          <br />
          <span className="font-bold">{routeLabel}</span>
        </p>

        <div className="flex justify-between font-bold">
          <button
            className="p-2 bg-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-xl cursor-pointer"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="p-2 bg-blue-400 text-blue-800 hover:bg-blue-800 hover:text-white rounded-xl transition-colors cursor-pointer"
            onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}