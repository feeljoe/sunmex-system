"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import PrepareOrderModal from "../modals/PreparePreorderModal";
import { RefreshButton } from "../ui/RefreshButton";
import SubmitResultModal from "../modals/SubmitResultModal";
import { formatCurrency } from "@/utils/format";

export function WarehousePreordersTable( { user } : any) {
    const {items:preorders, reload} = useList("/api/preOrders/warehouse");
    const {items:routes} = useList("/api/routes", { type: "driver" });
    // Fetch categories so we can map them dynamically
    const { items: categories } = useList("/api/types", { limit: 100 });
    const sortedCategories = [...(categories || [])].sort((a,b) => (a.order || 0) - (b.order || 0));

    const [selectedRoute, setSelectedRoute] = useState<string>("");
    const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"pending" | "completed">("pending");
    const [statusView, setStatusView] = useState<"all" | "pending" | "completed">("pending");
    const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);

    const filteredPreorders = preorders.filter((p: any) => {
        if (selectedRoute && p.routeAssigned?._id !== selectedRoute) return false;
        if (statusView === "pending" && p.status !== "assigned") return false;
        if (statusView === "completed" && p.status !== "ready") return false;
        return true;
    });

    const handleViewMode = (value: "pending" | "completed")=> {
        if(viewMode === value) return;
        setViewMode(value);
    };

    const formatDate = (v?: string) => v? new Date(v).toLocaleDateString(): "-";

    const statusColors: Record<string, string> = {
        assigned: "bg-purple-400 text-purple-800",
        ready: "bg-green-400 text-green-800",
    };

    return (
        <>
            <div className={`bg-(--secondary) font-mono font-bold rounded-xl shadow-xl p-4 flex flex-col ${user.role === "admin" ? "h-[85vh] w-[88vw]" : "h-[80vh] w-[97vw]"}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-4 items-center h-10">
                        <label className="font-semibold">Route:</label>
                        <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="rounded-xl h-10 bg-white shadow-xl p-2 outline-hidden">
                            <option value="">All Routes</option>
                            {routes.map((r: any) => (
                                <option key={r._id} value={r._id}>{r.code} | {r.user?.firstName} {r.user?.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 p-1 bg-gray-200 rounded-xl">
                        <button onClick={() => { setSubmitStatus("loading"); setStatusView("pending"); handleViewMode("pending"); setTimeout(() => setSubmitStatus(null), 1000); }} className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "pending" ? "bg-white shadow-md text-blue-800": "text-gray-500 hover:bg-gray-400"}`}>Pending</button>
                        <button onClick={() => { setSubmitStatus("loading"); setStatusView("completed"); handleViewMode("completed"); setTimeout(() => setSubmitStatus(null), 1000); }} className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "completed" ? "bg-white shadow-md text-green-800": "text-gray-500 hover:bg-gray-400"}`}>Completed</button>
                    </div>

                    <RefreshButton onRefresh={() => { setSubmitStatus("loading"); reload(); setTimeout(() => setSubmitStatus(null), 3000); }}/>
                </div>
                <div className="overflow-y-auto rounded-xl shadow-xl bg-white">
                <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-(--tertiary) sticky top-0">
                            <tr className="border-b">
                                <th className="p-2">Client</th>
                                <th className="p-2 text-center">Route</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Total Items</th>
                                <th className="p-2 text-center overflow-y-auto w-40">Amount ($)</th>
                                <th className="p-2 text-center">Date</th>
                                <th className="p-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {filteredPreorders.map((p: any) => {
                                const status = p.status === "assigned" ? "pending" : p.status === "ready" ? "Assembled" : p.status;
                                return (
                                <tr key={p._id} className={`border-b hover:bg-gray-100 ${p.status === "ready" ? "bg-green-100" : ""}`}>
                                    <td className="p-2 capitalize">{p.client?.clientName.toLowerCase()}</td>
                                    <td className="p-2 text-center">{p.routeAssigned?.code}</td>
                                    <td className="text-center">
                                        <span className={`p-2 rounded-xl font-bold ${statusColors[p.status] || "bg-gray-400"}`}>{status?.toUpperCase()}</span>
                                    </td>
                                    <td className="p-2 text-center">{p.products.reduce((sum: number, pr: any) => sum + pr.quantity, 0)}</td>
                                    
                                    {/* DYNAMIC CATEGORY AMOUNTS */}
                                    <td className="flex gap-2 py-1 overflow-auto w-60">
                                    {sortedCategories.map(cat => {
                                        const catTotal = p.products
                                            .filter((pr: any) => pr.productInventory?.product?.productType?._id === cat._id)
                                            .reduce((sum: number, pr: any) => sum + (pr.quantity * pr.actualCost), 0);
                                        if(catTotal > 0) return (
                                            <div key={cat._id} className="p-1 flex flex-col text-center font-bold bg-blue-200 text-blue-800 rounded-xl">
                                                <span className="capitalize">{cat.name?.toLowerCase()}</span>
                                                <span>{formatCurrency(catTotal)}</span>
                                            </div>
                                            )
                                    })}
                                    </td>

                                    <td className="p-2 text-center">{formatDate(p.createdAt)}</td>
                                    <td className="p-2 text-center">
                                        <button className={`p-2 rounded-xl transition-all duration:300 cursor-pointer ${p.status === "assigned" ? "bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800" : "bg-yellow-400 text-yellow-800 hover:text-white hover:bg-gray-800"}`} onClick={() => setSelectedPreorder(p)}>
                                            {p.status === "assigned" ? "Prepare" : "Review"}
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                </table>
                </div>
            </div>
            {selectedPreorder && (
                <PrepareOrderModal
                    user={user}
                    preorder={selectedPreorder}
                    categories={sortedCategories} // Pass categories down for sorting!
                    onClose={() => setSelectedPreorder(null)}
                    readOnly={selectedPreorder?.status === "ready"} 
                    onCompleted={() => { setSelectedPreorder(null); reload(); }}
                />
            )}
            {submitStatus && 
                <SubmitResultModal 
                    status={submitStatus} 
                    message={""} 
                    onClose={() => setSubmitStatus(null)} 
                    collection="Warehouse Preorders" 
                />
            }
        </>
    )
}