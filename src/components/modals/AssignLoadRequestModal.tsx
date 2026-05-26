"use client";

import { useState } from "react";
import { useList } from "@/utils/useList";

export default function AssignLoadRequestRouteModal({
  loadRequestIds,
  onClose,
  onAssigned,
}: {
  loadRequestIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { items: routes } = useList("/api/routes");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [loading, setLoading] = useState(false);

  const assign = async () => {
    if (!selectedRoute) return;

    setLoading(true);

    const res = await fetch("/api/load-requests/assign-route", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute,
        loadRequestIds,
      }),
    });

    setLoading(false);

    if (res.ok) {
      onAssigned();
      onClose();
    } else {
      const err = await res.json();
      alert(err.error || "Error assigning route");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96 shadow-xl">

        <h2 className="text-xl font-bold mb-4 text-center">
          Assign Load Request
        </h2>

        <select
          className="w-full p-3 rounded-xl bg-gray-100 mb-4"
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
        >
          <option value="">Select Route</option>
          {routes.map((r: any) => (
            <option key={r._id} value={r._id}>
              {r.code} - {r.user?.firstName}
            </option>
          ))}
        </select>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={assign}
            disabled={!selectedRoute || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}