"use client";

import { useState } from "react";
import { useList } from "@/utils/useList";
import BulkAssignConfirmModal from "./BulkAssignConfirmModal";
import { DateTime } from "luxon";

export default function AssignRouteModal({
  clientName,
  preorderId,
  creditMemoId,
  currentRouteId,
  onClose,
  onAssigned,
  preorderIds,
  creditMemoIds,
  bulkMode,
}: {
  clientName?: string;
  preorderId?: string;
  creditMemoId?: string;
  currentRouteId?: string;
  onClose: () => void;
  onAssigned: (data: any) => void;
  preorderIds?: string[];
  creditMemoIds?: string[];
  bulkMode?: boolean;
}) {
  const { items: routes } = useList("/api/routes");
  const [selectedRoute, setSelectedRoute] = useState(currentRouteId || "");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const route = routes.find((r: any) => r._id === selectedRoute);

  const selectedRouteLabel = route
    ? `${route.code} (${route.user?.firstName} ${route.user?.lastName})`
    : "";

    const handleAssignSingle = async () => {
      if (!selectedRoute || (!preorderId && !creditMemoId)) return;
    
      setLoading(true);
    
      const res = await fetch(`/api/preOrders/assign-route-bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: selectedRoute,
          preorderIds: preorderId ? [preorderId] : undefined,
          creditMemoIds: creditMemoId ? [creditMemoId] : undefined,
          deliveryDate: deliveryDate || undefined,
        }),
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
    if (!selectedRoute || (!preorderIds?.length && !creditMemoIds?.length)) return;
    setLoading(true);
    const res = await fetch(`/api/preOrders/assign-route-bulk`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute,
        preorderIds,
        creditMemoIds,
        deliveryDate: deliveryDate || undefined,
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
        <div className="flex flex-col p-5 bg-(--secondary) rounded-xl shadow-xl w-2/3 h-3/5 lg:w-1/2 lg:h-1/3">
      
          <h2 className="text-xl lg:text-2xl text-center font-semibold mb-10 lg:mb-0">
            {bulkMode
              ? `Assign Route to ${
                  (preorderIds?.length || 0) + (creditMemoIds?.length || 0)
                } Items`
              : `Assign Route to ${clientName}`
            }
          </h2>
          {/* DELIVERY DATE PICKER */}
          {(creditMemoId || (creditMemoIds && creditMemoIds.length > 0)) && (
          <div className="mb-5 flex flex-col gap-2">
            <label className="text-sm lg:text-lg">Delivery Date (Optional)</label>
            <input
              type="date"
              className="p-2 rounded-xl bg-white shadow-xl w-full"
              value={deliveryDate || ""}
              onChange={(e) => setDeliveryDate(e.target.value)}
              max={DateTime.now().setZone("America/Phoenix").toISODate() || ""}
            />
          </div>
          )}
      {/* ROUTE SELECT */}
      <div className="mb-5 flex flex-col gap-2">
      <label className="text-sm lg:text-lg">Select Route to assign</label>
      <select
        className="w-full shadow-xl bg-white h-15 lg:h-15 text-xl p-2 rounded-xl"
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
      </div>

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
          disabled={
            !selectedRoute ||
            loading ||
            (!preorderIds?.length && !creditMemoIds?.length && !preorderId && !creditMemoId)
          }
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
        count={(preorderIds?.length || 0) + (creditMemoIds?.length || 0)}
        routeLabel={selectedRouteLabel}
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleAssignBulk}
      />
    )}
    </>
  );
}
