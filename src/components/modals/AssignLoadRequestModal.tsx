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
    <div  onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div onClick={e => e.stopPropagation()}className="flex flex-col justify-between bg-(--secondary) p-2 rounded-xl min-h-[20vh] min-w-[70vw] md:min-w-[30vw] shadow-xl">
        <div className="flex flex-col gap-4">
        <h2 className="py-2 border-b text-2xl font-bold mb-4 text-center">
          Assign Load Request
        </h2>
      <div className="w-full h-10 rounded-xl bg-gray-100 mb-4">
        <select
          className="w-full h-full"
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
        >
          <option value="">Select Route</option>
          {routes.filter((r:any) => r.type === "driver").map((r: any) => (
            <option key={r._id} value={r._id}>
              {r.code} | {r.user?.firstName} {r.user?.lastName}
            </option>
          ))}
        </select>
        </div>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="p-2 bg-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={assign}
            disabled={!selectedRoute || loading}
            className="p-2 bg-blue-400 hover:bg-blue-800 text-blue-800 hover:text-white transition-colors cursor-pointer rounded-xl"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}