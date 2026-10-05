"use client";

import { useEffect, useState } from "react";
import { useList } from "@/utils/useList";
import BulkAssignConfirmModal from "./BulkAssignConfirmModal";
import SubmitResultModal from "./SubmitResultModal";
import { SingleDatePicker } from "../ui/SingleDatePicker";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- SORTABLE ITEM COMPONENT ---
function SortablePreorderItem({ po, idx, isSelected, toggleSelect, statusColors, activeId, selectedListIds, moveGroup, isFlashing }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: po._id });

  // Logic to handle multi-drag visual states seamlessly
  const isDraggingThis = activeId === po._id;
  const isPartOfDraggedGroup = activeId && selectedListIds.includes(activeId) && selectedListIds.includes(po._id);
  const isVisuallyDragging = isDraggingThis || isPartOfDraggedGroup;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDraggingThis ? 40 : 1,
    // INSTEAD of collapsing height (which glitches the grid), we fade out the original items to 30% 
    opacity: isVisuallyDragging ? 0.3 : 1,
    height: "4rem",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between border-2 rounded-xl bg-white transition-all duration-500 cursor-grab active:cursor-grabbing ${isFlashing
          ? "border-green-400 bg-green-50 shadow-[0_0_15px_rgba(74,222,128,0.5)] scale-[1.02] z-10" // The Flash highlight for arrows!
          : isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:bg-gray-50 shadow-sm"
        }`}
    >
      <div className="flex items-center gap-2 w-full px-2">
        <div className="text-blue-800 shrink-0 p-1 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </div>

        {/* Checkbox MUST stop propagation so clicking it selects instead of dragging */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(po._id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-5 h-5 cursor-pointer shrink-0"
        />

        <div className="flex flex-col w-full min-w-0 justify-between gap-1 overflow-hidden pointer-events-none select-none">
          <span className="font-bold text-sm md:text-[16px] truncate flex items-center gap-2">
            {idx + 1}. {po.client?.clientName || po.client?.name}
          </span>
          <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest truncate">
            #{po.number} | <span className={`${statusColors[po.status] || "bg-gray-200"} px-1 rounded-md`}>{po.status}</span>
          </span>
        </div>
      </div>

      {/* Action Buttons - Must stop propagation */}
      <div className="flex gap-1 pr-2 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => moveGroup(po._id, "up")}
          className="w-8 h-8 bg-blue-200 text-blue-800 font-bold rounded-xl hover:bg-blue-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
        </button>
        <button
          type="button"
          onClick={() => moveGroup(po._id, "down")}
          className="w-8 h-8 bg-blue-200 text-blue-800 font-bold rounded-xl hover:bg-blue-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
        </button>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
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

  const { items: routes } = useList("/api/routes", { limit: 1000, type: "driver" });
  const { items: warehouseUsers } = useList("/api/users", { limit: 1000, search: "warehouse" });

  const [selectedRoute, setSelectedRoute] = useState(currentRouteId || "");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<any>(null);

  const route = routes.find((r: any) => r._id === selectedRoute);
  const selectedRouteLabel = route ? `${route.code} | ${route.user?.firstName} ${route.user?.lastName}` : "";

  const [preorderData, setPreorderData] = useState<any[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

  // NEW: State for visual dragging and flashing feedback
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flashingIds, setFlashingIds] = useState<string[]>([]);

  const [fetchingPreorders, setFetchingPreoders] = useState(false);
  const [creditMemoData, setCreditMemoData] = useState<any[]>([]);
  const [fetchingCreditMemos, setFetchingCreditMemos] = useState(false);

  const hasPreorders = (preorderIds && preorderIds.length > 0) || preorderId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchPreorders = async () => {
      const idsToFetch = preorderIds?.length ? preorderIds : (preorderId ? [preorderId] : []);
      if (idsToFetch.length === 0) return;

      setFetchingPreoders(true);
      try {
        const res = await fetch(`/api/preOrders/bulk`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToFetch }),
        });
        if (!res.ok) throw new Error("Failed to fetch preorders in bulk");

        const results = await res.json();
        results.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
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
      if (idsToFetch.length === 0) return;

      setFetchingCreditMemos(true);
      try {
        const results = await Promise.all(idsToFetch.map(id => fetch(`/api/credit-memos/${id}`).then(res => res.json())));
        setCreditMemoData(results);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingCreditMemos(false);
      }
    };
    fetchCreditMemos();
  }, [creditMemoIds, creditMemoId]);

  // ARROW BUTTON LOGIC (With Flash effect)
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

      // Trigger the green visual highlight so the user easily sees where the items snapped to
      setFlashingIds(targets);
      setTimeout(() => setFlashingIds([]), 800);

      return remaining;
    });
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setPreorderData((items) => {
        const oldIndex = items.findIndex((i) => i._id === active.id);
        const newIndex = items.findIndex((i) => i._id === over.id);

        if (selectedListIds.includes(active.id) && selectedListIds.length > 1) {
          const moving = items.filter(c => selectedListIds.includes(c._id));
          const remaining = items.filter(c => !selectedListIds.includes(c._id));
          const unselectedBefore = items.slice(0, newIndex).filter(c => !selectedListIds.includes(c._id)).length;
          remaining.splice(unselectedBefore, 0, ...moving);
          return remaining;
        }
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const toggleSelect = (id: string) => {
    setSelectedListIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssignSingle = async () => {
    if (!selectedRoute || (!preorderId && !creditMemoId)) return;
    setLoading(true); setSubmitStatus("loading");
    const res = await fetch(`/api/preOrders/assign-route-bulk`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRoute, warehouseId: selectedWarehouse || undefined,
        preorderIds: preorderId ? [preorderId] : undefined, creditMemoIds: creditMemoId ? [creditMemoId] : undefined, deliveryDate: deliveryDate || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setSubmitStatus("success"); setMessage("Route Assigned Successfully"); setData(data); onClose(); }
    else { setSubmitStatus("error"); setMessage(data.error || "Error assigning route"); }
  };

  const handleAssignBulk = async () => {
    if (!selectedRoute || (!preorderIds?.length && !creditMemoIds?.length)) return;
    const totalCount = (preorderIds?.length || 0) + (creditMemoIds?.length || 0);
    setConfirmOpen(false); setLoading(true); setSubmitStatus("loading");
    try {
      const res = await fetch(`/api/preOrders/assign-route-bulk`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: selectedRoute, warehouseId: selectedWarehouse || undefined,
          preorderIds: preorderData.map(p => p._id), creditMemoIds, deliveryDate: deliveryDate || undefined,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) { setSubmitStatus("success"); setMessage(`${totalCount} items have been assigned successfully.`); setData(data); }
      else { setSubmitStatus("error"); setMessage(data.error || "Error assigning routes"); }
    } catch (err: any) {
      setLoading(false); setSubmitStatus("error"); setMessage(`An unexpected error occured: ${err.message}`);
    }
  };

  const columnCount = preorderData.length > 10 ? 3 : preorderData.length > 5 ? 2 : 1;
  const rowCount = Math.ceil(preorderData.length / columnCount);

  // Setup for DragOverlay Payload
  const activeItemData = activeId ? preorderData.find(p => p._id === activeId) : null;
  const draggedGroupCount = activeId && selectedListIds.includes(activeId) ? selectedListIds.length : 1;

  return (
    <>
      <div className="fixed inset-0 z-50 w-full bg-black/50 space-y-4 flex items-center justify-center p-2">
        <div className={`flex flex-col bg-(--secondary) rounded-xl shadow-xl max-w-[95vw] md:max-w-[50vw] ${bulkMode ? "max-h-[95vh] min-h-[40vh]" : "max-h-[50vh] min-h-[30vh]"} overflow-hidden w-full`}>
          <div className="flex justify-between items-center p-2 bg-(--tertiary)">
            <h2 className="text-xl lg:text-2xl text-center font-bold">
              {bulkMode ? `Assign Routes & Logistics (${(preorderIds?.length || 0) + (creditMemoIds?.length || 0)} Items)` : `Assign Route & Logistics`}
            </h2>
            <button onClick={onClose} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className={`grid grid-cols-1 md:flex gap-4 mb-4 p-2 md:justify-center`}>
            <div className="flex flex-col gap-2 items-center">
              <label className="text-sm font-bold text-gray-700 capitalize tracking-wide">Delivery Date</label>
              <SingleDatePicker value={deliveryDate || ""} onChange={(val) => setDeliveryDate(val)} reason="" text={hasPreorders ? "Select Delivery Date" : "Select Return Date"} />
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

          <div className="flex flex-col justify-between overflow-hidden flex-1">
            {preorderData.length > 0 && (
              <div className="flex flex-col rounded-xl p-2 flex-1 min-h-0">
                <div className="flex justify-center items-center mb-2 px-2 shrink-0">
                  <label className="text-sm md:text-xl font-bold text-gray-800">Set Delivery Order</label>
                </div>

                {fetchingPreorders ? (
                  <div className="flex-1 flex items-center justify-center font-bold text-blue-500 animate-pulse">Loading Invoices...</div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto w-full p-1 custom-scrollbar">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext items={preorderData.map(p => p._id)} strategy={rectSortingStrategy}>
                        <div
                          style={{
                            display: "flex flex-col md:grid",
                            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
                            gridAutoColumns: `minmax(250px, 1fr)`,
                            gridAutoFlow: "column",
                            gap: "0.25rem"
                          }}
                        >
                          {preorderData.map((po, idx) => (
                            <SortablePreorderItem
                              key={po._id}
                              po={po}
                              idx={idx}
                              isSelected={selectedListIds.includes(po._id)}
                              toggleSelect={toggleSelect}
                              statusColors={statusColors}
                              activeId={activeId}
                              selectedListIds={selectedListIds}
                              moveGroup={moveGroup}
                              isFlashing={flashingIds.includes(po._id)}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      {/* DRAG OVERLAY - The card that follows your cursor during dragging */}
                      <DragOverlay>
                        {activeId && activeItemData ? (
                          <div className="flex items-center justify-between border-2 border-blue-500 bg-blue-100 rounded-xl shadow-2xl h-[4rem] w-full cursor-grabbing opacity-100 scale-[0.95] origin-center">
                            <div className="flex items-center gap-2 w-full px-2">
                              <div className="text-blue-800 shrink-0 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                                </svg>
                              </div>
                              <input type="checkbox" checked={true} readOnly className="w-5 h-5 shrink-0 accent-blue-600" />
                              <div className="flex flex-col w-full min-w-0 justify-between gap-1 overflow-hidden">
                                <span className="font-bold text-sm truncate flex items-center gap-2">
                                  {activeItemData.client?.clientName || activeItemData.client?.name}
                                  {draggedGroupCount > 1 && (
                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-md">
                                      +{draggedGroupCount - 1} Selected
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                  #{activeItemData.number}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </DragOverlay>

                    </DndContext>
                  </div>
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
                            <span className="font-bold text-sm md:text-[16px] truncate">{idx + 1}. {cm.client?.clientName || cm.client?.name}</span>
                            <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">#{cm.number} | <span className={`${statusColors[cm.status] || "bg-gray-400 text-gray-800"} p-1 rounded-xl`}>{cm.status}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between p-1">
              <button className="p-2 bg-gray-300 font-bold rounded-xl shadow-xl hover:bg-gray-700 hover:text-white transition-colors cursor-pointer" onClick={onClose} disabled={loading || fetchingPreorders}>Cancel</button>
              <button className="p-2 bg-blue-400 text-blue-800 font-bold rounded-xl shadow-xl hover:bg-blue-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={bulkMode ? () => setConfirmOpen(true) : handleAssignSingle} disabled={!selectedRoute || loading || fetchingPreorders || (!preorderIds?.length && !creditMemoIds?.length && !preorderId && !creditMemoId)}>
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
          onConfirm={handleAssignBulk} />
      )}

      {submitStatus && (
        <SubmitResultModal status={submitStatus} message={message} collection="Route" onClose={() => { const wasSuccess = submitStatus === "success"; setSubmitStatus(null); setMessage(""); if (wasSuccess) onClose(); if (wasSuccess && data !== null) onAssigned(data); setData(null); }} />
      )}
    </>
  );
}