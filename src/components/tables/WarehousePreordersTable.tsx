"use client";

import { useList } from "@/utils/useList";
import { useState } from "react";
import PrepareOrderModal from "../modals/PreparePreorderModal";
import { RefreshButton } from "../ui/RefreshButton";

export function WarehousePreordersTable(user: any) {
    const {items:preorders, reload} = useList("/api/preOrders/warehouse");
    const {items:routes} = useList("/api/routes", {
        type: "driver",
    });

    const [selectedRoute, setSelectedRoute] = useState<string>("");
    const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
    const [statusView, setStatusView] = useState<"all" | "pending" | "completed">("pending");

    const filteredPreorders = preorders
    .filter((p: any) => {
        // Route filter
        if (selectedRoute && p.routeAssigned?._id !== selectedRoute) return false;

        // Status toggle filter
        if (statusView === "pending" && p.status !== "assigned") return false;
        if (statusView === "completed" && p.status !== "ready") return false;

        return true;
    });

    const formatDate = (v?: string) =>
        v? new Date(v).toLocaleDateString(): "-";

    return (
        <>
            <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-4 flex flex-col h-4/5">
                <div className="flex items-center justify-between">
                    <div className="flex gap-6 items-center">
                        
                        {/* Route filter */}
                        <div className="flex gap-2 items-center">
                        <label className="font-semibold">Route:</label>
                        <select 
                            value={selectedRoute}
                            onChange={(e) => setSelectedRoute(e.target.value)}
                            className="rounded-xl bg-white shadow-xl px-3 py-2"
                        >
                            <option value="">All routes</option>
                            {routes.map((r: any) => (
                            <option key={r._id} value={r._id}>
                                {r.code} {r.user.firstName} {r.user.lastName}
                            </option>
                            ))}
                        </select>
                        </div>

                        {/* Status toggle */}
                        <div className="flex gap-2 items-center">
                        <label className="font-semibold">View:</label>

                        {["all", "pending", "completed"].map((view) => (
                            <button
                            key={view}
                            onClick={() => setStatusView(view as any)}
                            className={`px-3 py-1 rounded-xl capitalize ${
                                statusView === view
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200"
                            }`}
                            >
                            {view}
                            </button>
                        ))}
                        </div>

                    </div>

                    <RefreshButton onRefresh={reload}/>
                </div>
                <div className="overflow-y-auto">
                <table className="w-full text-left">
                        <thead className="sticky">
                            <tr className="border-b">
                                <th className="p-2">Client</th>
                                <th className="p-2">Route</th>
                                <th className="p-2">Items</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Date</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPreorders.map((p: any) => (
                                <tr key={p._id} className={`border-b hover:bg-gray-50 ${
                                    p.status === "ready" ? "bg-green-50" : ""
                                  }`}>
                                    <td className="p-2 whitespace-nowrap capitalize">{p.client?.clientName.toLowerCase()}</td>
                                    <td className="p-2 whitespace-nowrap">{p.routeAssigned?.code}</td>
                                    <td className="p-2 whitespace-nowrap">
                                        {p.products.reduce(
                                            (sum: number, pr: any) => sum + pr.quantity,
                                            0
                                        )}
                                    </td>
                                    <td className="p-2 capitalize whitespace-nowrap">{p.status}</td>
                                    <td className="p-2 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                                    <td className="p-2 whitespace-nowrap">
                                        <button
                                            className={`px-5 py-3 rounded-xl transition-all duration:300 cursor-pointer ${
                                                p.status === "assigned"
                                                ? "bg-blue-500 text-white hover:bg-blue-300"
                                                : "bg-yellow-500 text-white hover:bg-gray-300"
                                            }`}
                                            onClick={() => setSelectedPreorder(p)}
                                            >
                                            {p.status === "assigned" ? "Prepare" : "Review"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                </table>
                </div>
            </div>
            {selectedPreorder && (
                <PrepareOrderModal
                    user = {user}
                    preorder= {selectedPreorder}
                    onClose= {() => setSelectedPreorder(null)}
                    readOnly={selectedPreorder?.status === "ready"} // edit disabled for prepared orders
                    onCompleted= {() => {
                        setSelectedPreorder(null);
                        reload();
                    }}
                />
            )}
        </>
    )
}