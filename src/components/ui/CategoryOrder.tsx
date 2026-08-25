"use client";

import { useEffect, useState } from "react";
import { useList } from "@/utils/useList";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { RefreshButton } from "./RefreshButton";

export default function CategoryOrderScreen() {
    const { items, reload, loading } = useList("/api/types", { limit: 100 });
    const [categories, setCategories] = useState<any[]>([]);
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);

    useEffect(() => {
        if (items) {
            // Ensure they are sorted by the 'order' field
            setCategories([...items].sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
    }, [items]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newCats = [...categories];
        [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
        setCategories(newCats);
    };

    const moveDown = (index: number) => {
        if (index === categories.length - 1) return;
        const newCats = [...categories];
        [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
        setCategories(newCats);
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
        <div className="mt-4 p-4 bg-(--secondary) max-h-[90vh] rounded-xl shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Warehouse Picking Order</h1>
                <div className="flex gap-5">
                <button onClick={saveOrder} className="bg-blue-400 text-blue-800 font-bold p-2 rounded-xl shadow-xl hover:bg-blue-800 hover:text-white transition-colors cursor-pointer">
                    Save Order
                </button>
                <RefreshButton onRefresh={() => {
                    reload();
                    setSubmitStatus("loading");
                    setTimeout(() => setSubmitStatus(null), 1000);
                }}/>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white rounded-xl shadow p-2">
                {loading ? <p className="text-center p-4">Loading...</p> : categories.map((cat, idx) => (
                    <div key={cat._id} className="flex items-center justify-between p-3 border-b hover:bg-gray-50">
                        <span className="font-bold text-lg">{idx + 1}. {cat.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 bg-gray-200 rounded-xl disabled:opacity-30">⬆</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === categories.length - 1} className="p-1 bg-gray-200 rounded-xl disabled:opacity-30">⬇</button>
                        </div>
                    </div>
                ))}
            </div>

            {submitStatus && <SubmitResultModal status={submitStatus} message={""} onClose={() => setSubmitStatus(null)} collection="Categories" />}
        </div>
    );
}