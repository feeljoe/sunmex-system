"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState, useMemo } from "react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import ReceiveRouteReturnsModal from "@/components/modals/ReceiveRouteReturnsModal";
import ViewRouteReturnsModal from "@/components/modals/ViewRouteReturnsModal";

export default function WarehouseReturnsTable({ user }: any) {
    const [viewMode, setViewMode] = useState<"pending" | "completed">("pending");
    const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("");
    const [selectedRouteToReceive, setSelectedRouteToReceive] = useState<any | null>(null);
    const [selectedRouteToView, setSelectedRouteToView] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);

    // Only fetch pending items for this view
    const { items: returns, reload } = useList("/api/warehouse/returns");
    const { items: routes } = useList("/api/routes", { type: "driver" });

    // Group the raw returns by Route
    const groupedRoutes = useMemo(() => {
        const map = new Map<string, any>();

        returns.forEach((r: any) => {
            if(r.status !== viewMode) return;

            const routeCode = r.routeAssigned?.code || "ZZZ";
            const routeId = r.routeAssigned?._id || "unassigned";
            const routeName = r.routeAssigned ? `${r.routeAssigned.code} | ${r.routeAssigned.user?.firstName} ${r.routeAssigned.user?.lastName}` : "Unassigned Route";

            // If filtering by route, skip others
            if (selectedRouteFilter && routeId !== selectedRouteFilter) return;

            let finalProducts = [];
            let expectedUI = 0;

            if (r.type === "creditMemo") {
                finalProducts = r.products.filter((p:any) => (p.pickedQuantity || p.quantity || 0) > 0);
                if (finalProducts.length === 0) return;
                expectedUI = Math.round(finalProducts.reduce((sum: number, p: any) => sum + (p.pickedQuantity || p.quantity || 0), 0));
            } else if (r.type === "preorder") {
                finalProducts = r.products.filter((p: any) => {
                    const diff = (p.pickedQuantity || 0) - (p.deliveredQuantity || 0);
                    return diff > 0 && !!p.deviationReason;
                });
                if (finalProducts.length === 0) return;
                expectedUI = Math.round(finalProducts.reduce((sum: any, p:any) => sum + ((p.pickedQuantity || 0) - (p.deliveredQuantity || 0)), 0));
            }

            if (!map.has(routeId)) {
                map.set(routeId, {
                    routeId,
                    routeName,
                    routeCode,
                    creditMemos: [],
                    preorders: [],
                    totalExpectedUI: 0,
                });
            }

            const group = map.get(routeId);
            group.totalExpectedUI += expectedUI;

            if (r.type === "creditMemo") {
                group.creditMemos.push({...r, products: finalProducts });
            } else {
                group.preorders.push({...r, products: finalProducts });
            }
        });

        return Array.from(map.values())
            .filter(group => group.totalExpectedUI > 0 || group.preorders.length > 0)
            .sort((a, b) => a.routeCode.toLowerCase().localeCompare(b.routeCode.toLowerCase()));
    }, [returns, selectedRouteFilter, viewMode]);

    useEffect(() => {
        setTimeout(() => { setSubmitStatus(null); }, 3000);
    }, [reload]);

    const handleViewMode = (value: "pending" | "completed")=> {
        if(viewMode === value) return;
        setViewMode(value);
    };
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
                        <div className="flex gap-2 p-1 bg-gray-200 rounded-xl">
                                <button
                                    onClick={() => { handleViewMode("pending");}}
                                    className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "pending" ? "bg-white shadow-md text-blue-600": "text-gray-500 hover:bg-gray-300"}`}>
                                        Pending
                                </button>
                                <button
                                    onClick={() => { handleViewMode("completed");}}
                                    className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "completed" ? "bg-white shadow-md text-green-600": "text-gray-500 hover:bg-gray-300"}`}>
                                        Completed
                                </button>
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
                            {groupedRoutes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 font-semibold text-lg">No {viewMode} returns found.</td>
                                </tr>
                            ): (
                                groupedRoutes.map((routeGroup: any) => (
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
                                        {viewMode === "pending" ? (
                                                <button
                                                    className="px-6 py-3 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-md cursor-pointer"
                                                    onClick={() => {setSelectedRouteToReceive(routeGroup);} }
                                                >
                                                    Receive All
                                                </button>
                                            ) : (
                                                <button
                                                    className="px-6 py-3 text-sm font-bold rounded-xl bg-green-600 text-white hover:bg-green-500 shadow-md cursor-pointer"
                                                    onClick={() => {setSelectedRouteToView(routeGroup);}}
                                                >
                                                    View Summary
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
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

            {selectedRouteToView && (
                <ViewRouteReturnsModal
                    routeData={selectedRouteToView}
                    onClose={() => setSelectedRouteToView(null)}
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