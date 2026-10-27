"use client";
import { useEffect, useState } from "react";
import PreorderDetailsModal from "./PreorderDetailsModal";

export type InventoryLocation =
 | "phoenix"
 | "yuma"
 | "tucson"
 | "elPaso"
 | "lasVegas";

export type AllocationType =
 | "presaved"
 | "onRoute";

interface InventoryAllocation {
    _id: string;
    number: string;
    client: string;
    route: string;
    status: string;
    quantity: number;
    createdAt: string;
}

interface AllocationResponse {
    items: InventoryAllocation[];
    inventoryLocation: InventoryLocation;
    inventoryQuantity: number;
    allocatedQuantity: number;
    difference: number;
    userRole: string;
}
interface Props {
    inventoryId: string;
    productName: string;
    inventoryLocation: InventoryLocation;
    allocation: AllocationType;
    onClose: () => void;
}

const LOCATION_NAMES: Record<InventoryLocation, string> = {
    phoenix: "Phoenix",
    yuma: "Yuma",
    tucson: "Tucson",
    elPaso: "El Paso",
    lasVegas: "Las Vegas",
};

const PREORDER_API = "/api/preOrders";

export default function InventoryAllocationsModal({inventoryId, productName, inventoryLocation, allocation, onClose} : Props) {
    const [data, setData] = useState<AllocationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
    const [loadingPreorderId, setLoadingPreorderId] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        async function fetchAllocations() {
            setLoading(true);
            setError("");
            setData(null);
            try {
                const params = new URLSearchParams({
                    inventoryId, inventoryLocation, allocation,
                });
                const response = await fetch(`/api/productInventory/allocations?${params}`, {
                    signal: controller.signal,
                    cache: "no-store",
                });
                const result = await response.json();
                if(!response.ok) {
                    throw new Error(result.error || "Failed to retreive allocations");
                }
                if(!controller.signal.aborted){
                    setData(result);
                }
            } catch (error: any) {
                if( error.name !== "AbortError" && !controller.signal.aborted) {
                    setError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }
        fetchAllocations();
        return () => controller.abort();
    }, [inventoryId, inventoryLocation, allocation]);

    const openPreorder = async (id: string) => {
        if(loadingPreorderId) return;

        setLoadingPreorderId(id);
        setError("");
        try {
            const response = await fetch(`${PREORDER_API}/${id}`, {cache: "no-store"});
            const result = await response.json();
            if(!response.ok) {
                throw new Error(result.error || "Failed to load preorder");
            }
            setSelectedPreorder(result);
        } catch(err: any) {
            setError(err.message);
        }finally {
            setLoadingPreorderId(null);
        }
    };

    const title = allocation === "presaved" ? "Presaved Inventory Allocations" : "On Route Inventory Allocations";

    const formatQuantity = (value: number) => Number(value ?? 0).toLocaleString("en-US", {maximumFractionDigits: 2,});

    if(selectedPreorder) {
        return (
            <PreorderDetailsModal
                preorder={selectedPreorder}
                userRole={data?.userRole ?? "warehouse"}
                onEdit={() => {}}
                onClose={() => setSelectedPreorder(null)}
            />
        );
    }
    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-2"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-(--secondary) rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden font-mono">
                    <div className="bg-(--tertiary) p-2 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">
                                {title}
                            </h2>
                            <p className="text-sm font-semibold capitalize">
                                {productName}
                            </p>
                            <p className="text-sm text-gray-600">
                                Warehouse: {LOCATION_NAMES[inventoryLocation]}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-red-400 hover:bg-red-800 text-red-800 hover:text-white rounded-xl p-2 cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-2 overflow-y-auto flex-1">
                        {loading && (
                            <div className="flex justify-center items-center gap-3 p-10">
                                <div className="w-6 h-6 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"/>
                                <span className="font-bold">Loading Allocations...</span>
                            </div>
                        )}
                        {error && (
                            <p className="text-red-600 bg-red-100 p-2 rounded-xl mb-2">
                                {error}
                            </p>
                        )}
                        {!loading && data && (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-white rounded-xl shadow-xl p-2">
                                        <p className="text-gray-500 text-xs">Warehouse</p>
                                        <p className="font-bold">{LOCATION_NAMES[data.inventoryLocation]}</p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-xl p-2">
                                        <p className="text-gray-500 text-xs">Inventory Balance</p>
                                        <p className="font-bold text-xl">{formatQuantity(data.inventoryQuantity)}</p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-xl p-2">
                                        <p className="text-gray-500 text-xs">Difference</p>
                                        <p className={`font-bold text-xl ${Math.abs(data.difference) > 0.000001 ? "text-orange-600" : "text-green-600"}`}>
                                            {formatQuantity(data.difference)}
                                        </p>
                                    </div>
                                </div>
                                <div className="max-h-[48vh] overflow-auto rounded-xl shadow-xl">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-(--tertiary) sticky top-0">
                                            <tr className="whitespace-nowrap">
                                                <th className="p-2">Preorder #</th>
                                                <th className="p-2">Client</th>
                                                <th className="p-2">Route</th>
                                                <th className="p-2">Status</th>
                                                <th className="p-2 text-right">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {data.items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">NO matching preorders found</td>
                                                </tr>
                                            )}
                                            {data.items.map((item) => (
                                                <tr key={item._id} className="border-b hover:bg-gray-100">
                                                    <td className="p-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openPreorder(item._id)}
                                                            disabled={!!loadingPreorderId}
                                                            className="font-bold text-blue-500 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                                                {loadingPreorderId === item._id ? "Loading..." : `#${item.number}`}
                                                            </button>
                                                    </td>
                                                    <td className="p-2 capitalize">{item.client}</td>
                                                    <td className="p-2">{item.route}</td>
                                                    <td className="p-2 capitalize">
                                                        <span className={`px-2 py-1 rounded-xl font-bold ${item.status === "ready" ? "bg-blue-200 text-blue-800" : item.status === "assigned " ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-right font-bold">{formatQuantity(item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {data.items.length > 0 && (
                                            <tfoot className="bg-blue-50 font-bold">
                                                <tr>
                                                    <td className="p-2 text-right" colSpan={4}>Total Allocated:</td>
                                                    <td className="p-2 text-right">{formatQuantity(data.allocatedQuantity)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                                {Math.abs(data.difference) > 0.000001 && (
                                    <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl p-2 text-orange-800 text-sm">
                                        The current inventory balance differs from the quantities found in these preorders.
                                        Other allocations, partial picking or pending inventory adjustments may explain this difference.
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-3 text-center">
                                    Click a preorder number to view the full invoice.
                                </p>
                            </>
                        )}
                    </div>
                </div>
        </div>
    )
}