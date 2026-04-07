"use client";

import { useList } from "@/utils/useList";

export default function StepSelectRoute({
  selectedRoute,
  onSelect,
  onNext,
}: any) {
  const { items: routes } = useList("/api/routes?type=onRoute");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select Route</h2>

      <select
        className="w-full p-2 rounded border"
        value={selectedRoute?._id || ""}
        onChange={e =>
          onSelect(routes.find((r: any) => r._id === e.target.value))
        }
      >
        <option value="">Select route</option>
        {routes.map((r: any) => (
          <option key={r._id} value={r._id}>
            {r.code}
          </option>
        ))}
      </select>

      <button
        disabled={!selectedRoute}
        onClick={onNext}
        className="btn-primary"
      >
        Next
      </button>
    </div>
  );
}
