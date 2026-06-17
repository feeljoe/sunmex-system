"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState, useMemo } from "react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import ReceiveRouteReturnsModal from "@/components/modals/ReceiveRouteReturnsModal";

export default function WarehouseReturnsTable({ user }: any) {
    const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("");
    const [selectedRouteToReceive, setSelectedRouteToReceive] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);

    // Only fetch pending items for this view
    const { items: returns, reload } = useList("/api/warehouse/returns", {
        status: "pending", 
    });
    
    const { items: routes } = useList("/api/routes", { type: "driver" });

    // Group the raw returns by Route
    const groupedRoutes = useMemo(() => {
        const map = new Map<string, any>();

        returns.forEach((r: any) => {
            const routeId = r.routeAssigned?._id || "unassigned";
            const routeName = r.routeAssigned ? `${r.routeAssigned.code} | ${r.routeAssigned.user?.firstName} ${r.routeAssigned.user?.lastName}` : "Unassigned Route";

            // If filtering by route, skip others
            if (selectedRouteFilter && routeId !== selectedRouteFilter) return;

            // 1. Filter out any products where pickedQuantity is 0 or undefined
            const validProducts = r.products.filter((p: any) => (p.pickedQuantity || 0) > 0);

            // 2. If this credit memo has NO valid products left, skip the entire document!
            if (validProducts.length === 0) return;

            if (!map.has(routeId)) {
                map.set(routeId, {
                    routeId,
                    routeName,
                    creditMemos: [],
                    preorders: [],
                    totalExpectedUI: 0,
                });
            }

            const group = map.get(routeId);
            
            if (r.type === "creditMemo") {
                const validProducts = r.products.filter((p: any) => (p.pickedQuantity || 0) > 0);
                if (validProducts.length === 0) return;

                group.creditMemos.push({ ...r, products: validProducts });

                group.totalExpectedUI += validProducts.reduce((sum: number, p: any) => sum + p.pickedQuantity, 0);
            }else if (r.type === "preorder") {
                group.preorders.push(r);
                const uiItems = r.products.filter((p: any) => {
                    const diff = (p.pickedQuantity || 0) - (p.deliveredQuantity || 0);
                    return diff > 0 && p.deviationReason !== "missing";
                });
                group.totalExpectedUI += uiItems.reduce((sum: number, p: any) => sum + (p.pickedQuantity - (p.deliveredQuantity || 0)), 0);
            }
        });

        return Array.from(map.values()).filter(group => group.totalExpectedUI > 0 || group.preorders.length > 0);
    }, [returns, selectedRouteFilter]);

    useEffect(() => {
        setTimeout(() => { setSubmitStatus(null); }, 3000);
    }, [reload]);

    return (
        <div className="p-4 h-full">
            <h1 className="text-3xl font-bold text-center mb-6 dark:text-white">Warehouse Returns (By Driver)</h1>

            <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-4 flex flex-col h-[75vh] w-[90vw]">
                <div className="flex items-center justify-between">
                    <div className="flex gap-6 items-center">
                        <div className="flex gap-2 items-center">
                            <label className="font-semibold">Filter Driver:</label>
                            <select 
                                value={selectedRouteFilter}
                                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                                className="rounded-xl bg-white shadow-xl px-3 py-2 outline-hidden"
                            >
                                <option value="">All Pending Drivers</option>
                                {routes.map((r: any) => (
                                    <option key={r._id} value={r._id}>
                                        {r.code} {r.user?.firstName} {r.user?.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <RefreshButton onRefresh={() => { reload(); setSubmitStatus("loading"); }}/>
                </div>

                <div className="overflow-y-auto bg-white rounded-xl shadow-sm flex-1">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr className="border-b">
                                <th className="p-4">Driver / Route</th>
                                <th className="p-4">Pending CM Documents</th>
                                <th className="p-4">Total Expected Items</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedRoutes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 font-semibold text-lg">No pending returns found.</td>
                                </tr>
                            )}
                            {groupedRoutes.map((routeGroup: any) => (
                                <tr key={routeGroup.routeId} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-bold text-lg capitalize">{routeGroup.routeName}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                                            {routeGroup.creditMemos.length + routeGroup.preorders.length} Docs
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 font-semibold">
                                        {routeGroup.totalExpectedUI} Items
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            className="px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 cursor-pointer bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                                            onClick={() => setSelectedRouteToReceive(routeGroup)}
                                        >
                                            Receive All
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRouteToReceive && (
                <ReceiveRouteReturnsModal
                    user={user}
                    routeData={selectedRouteToReceive}
                    onClose={() => setSelectedRouteToReceive(null)}
                    onCompleted={() => {
                        setSelectedRouteToReceive(null);
                        reload();
                    }}
                />
            )}

            {submitStatus && (
                <SubmitResultModal
                    status={submitStatus}
                    message={""}
                    onClose={() => setSubmitStatus(null)}
                    collection="Warehouse Returns"
                />
            )}
        </div>
    );
}