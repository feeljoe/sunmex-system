"use client";

import { useEffect, useState } from "react";
import { useList } from "@/utils/useList";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { RefreshButton } from "./RefreshButton";
import { Reorder } from "framer-motion";

export default function CategoryOrderScreen() {
    const { items, reload, loading } = useList("/api/types", { limit: 100 });
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStartOrder, setDragStartOrder] = useState<string[]>([]);
    
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);

    useEffect(() => {
        if (items) {
            setCategories([...items].sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
    }, [items]);

    const moveGroup = (id: string, direction: "up" | "down") => {
        setCategories(prevCats => {
            const targets = selectedIds.includes(id) ? selectedIds : [id];
            if (targets.length === 0) return prevCats;

            const moving = prevCats.filter(c => targets.includes(c._id));
            const remaining = prevCats.filter(c => !targets.includes(c._id));

            const indices = targets.map(t => prevCats.findIndex(c => c._id === t));
            const minIdx = Math.min(...indices);
            const maxIdx = Math.max(...indices);

            if (direction === "up" && minIdx === 0) return prevCats;
            if (direction === "down" && maxIdx === prevCats.length - 1) return prevCats;

            let insertIndex = 0;
            if (direction === "up") {
                const unselectedBefore = prevCats.slice(0, minIdx).filter(c => !targets.includes(c._id));
                insertIndex = Math.max(0, unselectedBefore.length - 1);
            } else {
                const unselectedBeforeMax = prevCats.slice(0, maxIdx + 1).filter(c => !targets.includes(c._id));
                insertIndex = unselectedBeforeMax.length + 1;
            }

            remaining.splice(insertIndex, 0, ...moving);
            return remaining;
        });
    };

    const handleDragEnd = () => {
        setCategories(prevCats => {
            if (draggingId && selectedIds.includes(draggingId) && selectedIds.length > 1) {
                const finalDragIdx = prevCats.findIndex(c => c._id === draggingId);
                
                const moving = prevCats
                    .filter(c => selectedIds.includes(c._id))
                    .sort((a, b) => dragStartOrder.indexOf(a._id) - dragStartOrder.indexOf(b._id));
                    
                const remaining = prevCats.filter(c => !selectedIds.includes(c._id));
                const unselectedBefore = prevCats.slice(0, finalDragIdx).filter(c => !selectedIds.includes(c._id)).length;
                
                remaining.splice(unselectedBefore, 0, ...moving);
                return remaining;
            }
            return prevCats;
        });
        setDraggingId(null);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === categories.length) setSelectedIds([]);
        else setSelectedIds(categories.map(c => c._id));
    };

    const saveOrder = async () => {
        setSubmitStatus("loading");
        const payload = categories.map((cat, index) => ({ _id: cat._id, order: index }));

        const res = await fetch("/api/types/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setSubmitStatus("success");
            reload();
        } else {
            setSubmitStatus("error");
        }
    };

    return (
        <div className="mt-4 p-4 bg-(--secondary) h-[80vh] md:h-[85vh] rounded-xl shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-lg md:text-2xl font-bold">Warehouse Picking Order</h1>
                <div className="flex gap-5">
                    <button onClick={saveOrder} className="text-sm md:text-[16px] bg-blue-400 text-blue-800 font-bold p-2 px-4 rounded-xl shadow-xl hover:bg-blue-800 hover:text-white transition-colors cursor-pointer">
                        Save Order
                    </button>
                    <RefreshButton onRefresh={() => {
                        reload();
                        setSubmitStatus("loading");
                        setTimeout(() => setSubmitStatus(null), 1000);
                    }} />
                </div>
            </div>

            <Reorder.Group
                axis="y"
                values={categories}
                onReorder={setCategories}
                className="flex-1 overflow-x-hidden overflow-y-auto rounded-xl"
            >
                {loading ? <p className="text-center font-bold p-4 text-gray-500 animate-pulse">Loading Categories...</p> : categories.map((cat, idx) => {
                    
                    const isSelected = selectedIds.includes(cat._id);
                    const isDraggingThis = draggingId === cat._id;
                    const isDraggingGroup = draggingId && selectedIds.includes(draggingId) && selectedIds.length > 1;
                    
                    const isHiddenInStack = isDraggingGroup && isSelected && !isDraggingThis;

                    return (
                    <Reorder.Item
                        key={cat._id}
                        value={cat}
                        onDragStart={() => {
                            setDraggingId(cat._id);
                            setDragStartOrder(categories.map(c => c._id)); // Snapshot order
                        }}
                        onDragEnd={handleDragEnd}
                        animate={{
                            height: isHiddenInStack ? 0 : "auto",
                            opacity: isHiddenInStack ? 0 : 1,
                            padding: isHiddenInStack ? 0 : 12, 
                            marginBottom: isHiddenInStack ? 0 : 8,
                            borderWidth: isHiddenInStack ? "0px" : "2px", // 🔥 FIX: String values for Framer Motion
                            scale: isDraggingThis ? 0.95 : 1,
                            boxShadow: isDraggingThis ? "0px 10px 20px rgba(0,0,0,0.15)" : "0px 1px 3px rgba(0,0,0,0.05)",
                            zIndex: isDraggingThis ? 50 : 1
                        }}
                        className={`flex items-center justify-between border-2 rounded-xl bg-white overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
                            isSelected ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-gray-50 shadow-sm"
                        } ${isHiddenInStack ? "pointer-events-none" : ""}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                                </svg>
                            </div>

                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(cat._id)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-6 h-6 cursor-pointer"
                            />

                            <span className="font-bold text-lg md:text-xl capitalize flex items-center gap-3">
                                {idx + 1}. {cat.name?.toLowerCase()}

                                {isDraggingGroup && isDraggingThis && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                        +{selectedIds.length - 1} items
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => moveGroup(cat._id, "up")}
                                className="py-2 px-3 bg-blue-200 text-blue-800 font-bold rounded-full hover:bg-blue-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <span className="hidden md:block">⬆</span>
                                <span className="md:hidden">Up</span>
                            </button>
                            <button
                                onClick={() => moveGroup(cat._id, "down")}
                                className="py-2 px-3 bg-blue-200 text-blue-800 font-bold rounded-full hover:bg-blue-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <span className="hidden md:block">⬇</span>
                                <span className="md:hidden">Down</span>
                            </button>
                        </div>
                    </Reorder.Item>
                )})}
            </Reorder.Group>

            {submitStatus && <SubmitResultModal status={submitStatus} message={""} onClose={() => setSubmitStatus(null)} collection="Categories" />}
        </div>
    );
}