"use client";

import { useState } from "react";
import { useList } from "@/utils/useList";
import BulkAssignConfirmModal from "./BulkAssignConfirmModal";

export default function AssignRouteModal({
  clientName,
  preorderId,
  currentRouteId,
  onClose,
  onAssigned,
  preorderIds,
  bulkMode,
}: {
  clientName?: string;
  preorderId?: string;
  currentRouteId?: string;
  onClose: () => void;
  onAssigned: (data: any) => void;
  preorderIds?: string[];
  bulkMode?: boolean;
}) {
  const { items: routes } = useList("/api/routes");
  const [selectedRoute, setSelectedRoute] = useState(currentRouteId || "");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedRouteLabel =
    routes.find((r: any) => r._id === selectedRoute)
    ? `${routes.find((r: any) => r._id === selectedRoute).code}
      (${routes.find((r: any) => r._id === selectedRoute).user?.firstName}
      ${routes.find((r: any) => r._id === selectedRoute).user?.lastName})`
    : "";

  const handleAssignSingle = async () => {
    if (!selectedRoute || !preorderId) return;
    setLoading(true);
    const res = await fetch(`/api/preOrders/${preorderId}/assign-route`, {
      method: "PATCH",
      body: JSON.stringify({ routeId: selectedRoute, preorderId: preorderId}),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onAssigned(data);
      onClose();
    } else {
      alert(data.error || "Error assigning route");
    }
  };
  const handleAssignBulk = async () => {
    if(!preorderIds?.length || !selectedRoute) return;
    setLoading(true);
    const res = await fetch(`/api/preOrders/assign-route-bulk`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute,
        preorderIds
      }),
    });
    const data = await res.json();
    setLoading(false);
    if(res.ok){
      onAssigned(data);
      onClose();
    }else {
      alert(data.error || "Error assigning routes");
    }
  };

  return (
    <>
    <div className="fixed inset-0 w-full bg-black/50 w-[-400px] space-y-4 flex items-center justify-center">
        <div className="flex flex-col p-5 lg:p-10 bg-(--secondary) rounded-xl shadow-xl w-2/3 h-3/5 lg:w-1/2 lg:h-1/4">
      
          <h2 className="text-xl lg:text-2xl text-center font-semibold mb-10 lg:mb-0">
            {bulkMode
            ? `Assign Route to ${preorderIds?.length} Preorders`
            : `Assign Route to ${clientName}`}
          </h2>

      <select
        className="w-full shadow-xl bg-white h-30 lg:h-40 text-xl p-2 rounded-xl mt-20 lg:mt-5"
        value={selectedRoute}
        onChange={(e) => setSelectedRoute(e.target.value)}
      >
        <option value="">Select a route</option>
        {routes.map((r: any) => (
          <option key={r._id} value={r._id}>
            {r.code} - ({r.user.firstName} {r.user.lastName})
          </option>
        ))}
      </select>

      <div className="flex items-end justify-between h-full">
        <button
          className="px-5 py-3 bg-gray-300 rounded-xl shadow-xl hover:bg-gray-500 hover:text-white hover:underline transition-all duration:300 cursor-pointer"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="px-5 py-3 bg-blue-500 text-white rounded-xl shadow-xl hover:bg-blue-300 hover:text-gray-500 hover:underline transition-all duration:300 cursor-pointer"
          onClick={
            bulkMode
              ? () =>setConfirmOpen(true)
              : handleAssignSingle
          }
          disabled={!selectedRoute || loading}
        >
          {loading 
            ? "Assigning..." 
            : bulkMode
            ? "Assign Routes" 
            : "Assign Route"
          }
        </button>
      </div>
      </div>
    </div>
    {confirmOpen && bulkMode && (
      <BulkAssignConfirmModal
        count={preorderIds?.length || 0}
        routeLabel={selectedRouteLabel}
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleAssignBulk}
      />
    )}
    </>
  );
}
