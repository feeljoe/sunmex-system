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

    const filteredPreorders = selectedRoute
    ? preorders.filter((p: any) => p.routeAssigned?._id === selectedRoute)
    : preorders;

    const formatDate = (v?: string) =>
        v? new Date(v).toLocaleDateString(): "-";

    return (
        <>
            <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-4 flex flex-col h-4/5">
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
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
                                <tr key={p._id} className="border-b hover:bg-gray-50">
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
                                        <button className="bg-blue-500 text-white px-5 py-3 rounded-xl hover:bg-blue-300 transition-all duration:300 cursor-pointer"
                                        onClick={() => setSelectedPreorder(p)}
                                        >
                                            Prepare
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
                    onCompleted= {() => {
                        setSelectedPreorder(null);
                        reload();
                    }}
                />
            )}
        </>
    )
}