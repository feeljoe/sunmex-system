"use client";

import { useEffect, useState } from "react";
import { useList } from "@/utils/useList";
import BulkAssignConfirmModal from "./BulkAssignConfirmModal";
import { Reorder } from "framer-motion";
import SubmitResultModal from "./SubmitResultModal";
import { SingleDatePicker } from "../ui/SingleDatePicker";

export default function AssignRouteModal({
  preorderId,
  creditMemoId,
  currentRouteId,
  onClose,
  onAssigned,
  preorderIds,
  creditMemoIds,
  bulkMode,
}: {
  preorderId?: string;
  creditMemoId?: string;
  currentRouteId?: string;
  onClose: () => void;
  onAssigned: (data: any) => void;
  preorderIds?: string[];
  creditMemoIds?: string[];
  bulkMode?: boolean;
}) {

  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    assigned: "bg-(--tertiary) text-(--quarteary)",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };

  const { items: routes } = useList("/api/routes", {
    limit: 1000,
    type: "driver"
  });
  const { items: warehouseUsers } = useList("/api/users", {
    limit: 1000,
    search: "warehouse"
  })
  const [selectedRoute, setSelectedRoute] = useState(currentRouteId || "");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const route = routes.find((r: any) => r._id === selectedRoute);

  const selectedRouteLabel = route
    ? `${route.code} | ${route.user?.firstName} ${route.user?.lastName}`
    : "";

  const [preorderData, setPreorderData] = useState<any[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartOrder, setDragStartOrder] = useState<string[]>([]);
  const [fetchingPreorders, setFetchingPreoders] = useState(false);

  const [creditMemoData, setCreditMemoData] = useState<any[]>([]);
  const [fetchingCreditMemos, setFetchingCreditMemos] = useState(false);

  const hasPreorders = (preorderIds && preorderIds.length > 0) || preorderId;
  useEffect(() => {
    const fetchPreorders = async () => {
      const idsToFetch = preorderIds?.length ? preorderIds : (preorderId ? [preorderId] : []);
      if (idsToFetch.length === 0) return;

      setFetchingPreoders(true);
      try {
        const results = await Promise.all(idsToFetch.map(id => fetch(`/api/preOrders/${id}`).then(res => res.json())));
        results.sort((a, b) => (a.position || 0) - (b.position || 0));
        setPreorderData(results);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingPreoders(false);
      }
    };
    fetchPreorders();
  }, [preorderIds, preorderId]);

  useEffect(() => {
    const fetchCreditMemos = async () => {
      const idsToFetch = creditMemoIds?.length ? creditMemoIds : (creditMemoId ? [creditMemoId] : []);
      if (idsToFetch.length === 0) {
        console.log("No CreditMemo Ids selected");
        return;
      }

      setFetchingCreditMemos(true);
      try {
        const results = await Promise.all(idsToFetch.map(id => fetch(`/api/credit-memos/${id}`).then(res => res.json())));
        setCreditMemoData(results);
        console.log(results);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingCreditMemos(false);
      }
    };
    fetchCreditMemos();
  }, [creditMemoIds, creditMemoId]);

  const moveGroup = (id: string, direction: "up" | "down") => {
    setPreorderData(prev => {
      const targets = selectedListIds.includes(id) ? selectedListIds : [id];
      if (targets.length === 0) return prev;

      const moving = prev.filter(c => targets.includes(c._id));
      const remaining = prev.filter(c => !targets.includes(c._id));

      const indices = targets.map(t => prev.findIndex(c => c._id === t));
      const minIdx = Math.min(...indices);
      const maxIdx = Math.max(...indices);

      if (direction === "up" && minIdx === 0) return prev;
      if (direction === "down" && maxIdx === prev.length - 1) return prev;

      let insertIndex = 0;
      if (direction === "up") {
        const unselectedBefore = prev.slice(0, minIdx).filter(c => !targets.includes(c._id));
        insertIndex = Math.max(0, unselectedBefore.length - 1);
      } else {
        const unselectedBeforeMax = prev.slice(0, maxIdx + 1).filter(c => !targets.includes(c._id));
        insertIndex = unselectedBeforeMax.length + 1;
      }

      remaining.splice(insertIndex, 0, ...moving);
      return remaining;
    });
  };

  const handleDragEnd = () => {
    setPreorderData(prev => {
      if (draggingId && selectedListIds.includes(draggingId) && selectedListIds.length > 1) {
        const finalDragIdx = prev.findIndex(c => c._id === draggingId);
        const moving = prev
          .filter(c => selectedListIds.includes(c._id))
          .sort((a, b) => dragStartOrder.indexOf(a._id) - dragStartOrder.indexOf(b._id));

        const remaining = prev.filter(c => !selectedListIds.includes(c._id));
        const unselectedBefore = prev.slice(0, finalDragIdx).filter(c => !selectedListIds.includes(c._id)).length;

        remaining.splice(unselectedBefore, 0, ...moving);
        return remaining;
      }
      return prev;
    });
    setDraggingId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedListIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };


  const handleAssignSingle = async () => {
    if (!selectedRoute || (!preorderId && !creditMemoId)) return;

    setLoading(true);
    setSubmitStatus("loading");

    const res = await fetch(`/api/preOrders/assign-route-bulk`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute,
        warehouseId: selectedWarehouse || undefined,
        preorderIds: preorderId ? [preorderId] : undefined,
        creditMemoIds: creditMemoId ? [creditMemoId] : undefined,
        deliveryDate: deliveryDate || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSubmitStatus("success");
      setMessage("Route Assigned Successfully");
      onAssigned(data);
      onClose();
    } else {
      setSubmitStatus("error");
      setMessage(data.error || "Error assigning route");
    }
  };
  const handleAssignBulk = async () => {
    if (!selectedRoute || (!preorderIds?.length && !creditMemoIds?.length)) return;
    setLoading(true);
    setSubmitStatus("loading");
    const res = await fetch(`/api/preOrders/assign-route-bulk`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute,
        warehouseId: selectedWarehouse || undefined,
        preorderIds: preorderData.map(p => p._id),
        creditMemoIds,
        deliveryDate: deliveryDate || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setSubmitStatus("success");
      setMessage("Routes Assigned Successfully");
      onAssigned(data);
      onClose();
    } else {
      setSubmitStatus("error");
      setMessage(data.error || "Error assigning routes");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 w-full bg-black/50 space-y-4 flex items-center justify-center p-2">
        {/* Expanded the modal slightly to fit the new Delivery Order list */}
        <div className="flex flex-col bg-(--secondary) rounded-xl shadow-xl max-w-2xl max-h-[95vh] min-h-[40vh] overflow-hidden">
          <div className="flex justify-between items-center p-2 bg-(--tertiary)">
            <h2 className="text-xl lg:text-2xl text-center font-bold">
              {bulkMode
                ? `Assign Routes & Logistics (${(preorderIds?.length || 0) + (creditMemoIds?.length || 0)} Items)`
                : `Assign Route & Logistics`
              }
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* GRID: Date & Dropdowns side-by-side on desktop */}
          <div className={`grid grid-cols-1 md:flex gap-4 mb-4 shrink-0 p-2 md:justify-center`}>
            <div className="flex flex-col gap-2 items-center">
              <label className="text-sm font-bold text-gray-700 capitalize tracking-wide">Delivery Date</label>
              <SingleDatePicker
                    value={deliveryDate || ""}
                    onChange={(val) => setDeliveryDate(val)}
                    reason=""
                    text={hasPreorders ? "Select Delivery Date": "Select Return Date"}
                  />
            </div>
            <div className="grid grid-cols-2 md:flex md:gap-4">
            <div className="flex flex-col gap-2 items-center">
              <label className="text-sm font-bold text-gray-700 capitalize tracking-wide">Route Assignment</label>
              <div className="md:w-full shadow-xl bg-white md:h-9 outline-none font-bold p-2 rounded-xl cursor-pointer">
              <select className="h-full w-full" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                <option value="">Select Route</option>
                {routes.map((r: any) => (<option key={r._id} value={r._id}>{r?.code} | {r?.user?.firstName} {r?.user?.lastName}</option>))}
              </select>
              </div>
            </div>

            {hasPreorders && (
              <div className="flex flex-col gap-2 items-center">
                <label className="text-sm font-bold text-gray-700 capitalize tracking-wide">Warehouse Assignment</label>
                <div className="md:w-full shadow-xl bg-white md:h-9 outline-none font-bold p-2 rounded-xl cursor-pointer">
                <select className="w-full h-full" value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                  <option value="">Select Picking</option>
                  {warehouseUsers.map((u: any) => (<option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>))}
                </select>
                </div>
              </div>
            )}
            </div>
          </div>
          
          <div className="flex flex-col justify-between">
          {/* PREORDER DELIVERY REORDER LIST */}
          {preorderData.length > 0 && (
            <div className="flex flex-col h-90 md:h-270 rounded-xl p-2">
              <div className="flex justify-center items-center mb-2 px-2">
                <label className="text-sm md:text-xl font-bold text-gray-800">Set Delivery Order</label>

              </div>

              {fetchingPreorders ? (
                <div className="flex-1 flex items-center justify-center font-bold text-blue-500 animate-pulse">Loading Invoices...</div>
              ) : (
                <Reorder.Group axis="y" values={preorderData} onReorder={setPreorderData} className="flex-1 overflow-x-hidden overflow-y-auto space-y-2 pr-1 pb-4">
                  {preorderData.map((po, idx) => {
                    const isSelected = selectedListIds.includes(po._id);
                    const isDraggingThis = draggingId === po._id;
                    const isDraggingGroup = draggingId && selectedListIds.includes(draggingId) && selectedListIds.length > 1;
                    const isHiddenInStack = isDraggingGroup && isSelected && !isDraggingThis;

                    return (
                      <Reorder.Item
                        key={po._id}
                        value={po}
                        onDragStart={() => { setDraggingId(po._id); setDragStartOrder(preorderData.map(c => c._id)); }}
                        onDragEnd={handleDragEnd}
                        animate={{
                          height: isHiddenInStack ? 0 : "auto", opacity: isHiddenInStack ? 0 : 1, padding: isHiddenInStack ? 0 : 8,
                          marginBottom: isHiddenInStack ? 0 : 8, borderWidth: isHiddenInStack ? "0px" : "2px", scale: isDraggingThis ? 0.95 : 1,
                          boxShadow: isDraggingThis ? "0px 10px 20px rgba(0,0,0,0.15)" : "0px 1px 3px rgba(0,0,0,0.05)", zIndex: isDraggingThis ? 50 : 1
                        }}
                        className={`flex items-center justify-between border-2 rounded-xl bg-white cursor-grab active:cursor-grabbing transition-colors ${isSelected ? "border-blue-500 bg-blue-100 hover:bg-blue-100" : "border-gray-100 hover:bg-gray-100 shadow-sm"
                          } ${isHiddenInStack ? "pointer-events-none" : ""}`}
                      >
                        <div className="flex h-10 items-center gap-4 w-full">
                          <div className="text-blue-800 cursor-grab active:cursor-grabbing">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                          </div>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(po._id)} onPointerDown={(e) => e.stopPropagation()} className="w-7 h-7 cursor-pointer shrink-0" />

                          <div className="flex flex-col w-full min-w-0 justify-between gap-2">
                            <span className="font-bold text-sm md:text-[16px] truncate flex items-center gap-2">
                              {idx + 1}. {po.client?.clientName || po.client?.name}
                              {isDraggingGroup && isDraggingThis && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">+{selectedListIds.length - 1}</span>
                              )}
                            </span>
                            <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                              #{po.number} | <span className={`${statusColors[po.status]} p-1 rounded-xl`}>{po.status}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
                          <button onClick={() => moveGroup(po._id, "up")} className="py-2 px-3 bg-blue-200 text-blue-800 font-bold rounded-full hover:bg-blue-400 hover:text-white transition-colors cursor-pointer hidden md:block">⬆</button>
                          <button onClick={() => moveGroup(po._id, "down")} className="py-2 px-3 bg-blue-200 text-blue-800 font-bold rounded-full hover:bg-blue-400 hover:text-white transition-colors cursor-pointer hidden md:block">⬇</button>
                        </div>
                      </Reorder.Item>
                    )
                  })}
                </Reorder.Group>
              )}
            </div>
          )}
          {creditMemoData.length > 0 && (
                <div className="flex flex-col min-h-0 px-2">
                  <div className="flex justify-center items-center mb-2 px-2">
                    <label className="text-sm md:text-lg font-bold text-gray-800">Credit Memos</label>
                  </div>

                  {fetchingCreditMemos ? (
                    <div className="flex items-center justify-center font-bold text-blue-500 animate-pulse p-4">Loading Credit Memos...</div>
                  ) : (
                    <div className="space-y-2 h-70 overflow-auto">
                      {creditMemoData.map((cm, idx) => (
                        <div key={cm._id} className="flex items-center justify-between border-2 border-gray-100 rounded-xl bg-gray-50 shadow-sm">
                          <div className="flex items-center gap-4 w-full overflow-hidden pl-2 h-14">
                            <div className="flex flex-col w-full min-w-0 justify-between gap-2">
                              <span className="font-bold text-sm md:text-[16px] truncate">
                                {idx + 1}. {cm.client?.clientName || cm.client?.name}
                              </span>
                              <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                #{cm.number} | <span className={`${statusColors[cm.status] || "bg-gray-400 text-gray-800"} p-1 rounded-xl`}>{cm.status}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

          <div className="flex justify-between shrink-0 p-2">
            <button className="py-2 px-4 bg-gray-300 font-bold rounded-xl shadow-xl hover:bg-gray-700 hover:text-white transition-colors cursor-pointer" onClick={onClose} disabled={loading || fetchingPreorders}>
              Cancel
            </button>
            <button
              className="p-2 bg-blue-400 text-blue-800 font-bold rounded-xl shadow-xl hover:bg-blue-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={bulkMode ? () => setConfirmOpen(true) : handleAssignSingle}
              disabled={!selectedRoute || loading || fetchingPreorders || (!preorderIds?.length && !creditMemoIds?.length && !preorderId && !creditMemoId)}
            >
              {loading ? "Assigning..." : "Assign Roles & Route"}
            </button>
          </div>
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

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          collection="Route"
          onClose={() => {
            setSubmitStatus(null);
            setMessage("");
          }}
        />
      )}
    </>
  );
}
