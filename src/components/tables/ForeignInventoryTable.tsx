"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/format";
import { RefreshButton } from "../ui/RefreshButton";
import ForeignInventoryDetailsModal from "../modals/ForeignInventoryDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";

export default function ForeignInventoryTable({userId} : {userId:any}) {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const fetchInventory = async () => {
    setLoading(true);
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/routes/inventory");
      if (res.ok) {
        const data = await res.json();
        setInventoryData(data.items || []);
        setSubmitStatus(null);
      }
    } catch (error) {
      console.error("Failed to fetch route inventory:", error);
      setSubmitStatus("error");
      setMessage("Failed to fetch route inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[90vw] max-w-6xl mx-auto h-[80vh] flex flex-col">
      <div className="flex justify-between items-end border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Active Route Inventory</h2>
          <p className="text-gray-600">Live view of product quantities and monetary value currently on routes.</p>
        </div>
        <RefreshButton onRefresh={fetchInventory} />
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-(--tertiary) z-10 border-b-3 text-lg">
            <tr>
              <th className="p-2 font-semibold">Route Code</th>
              <th className="p-2 font-semibold">Assigned User</th>
              <th className="p-2 font-semibold text-right">Total Items</th>
              <th className="p-2 font-semibold text-right">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-bold">Loading Inventory...</td></tr>
            ) : inventoryData.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No inventory found on any active routes.</td></tr>
            ) : (
              inventoryData.map((route) => (
                <tr 
                  key={route._id} 
                  onClick={() => setSelectedRoute(route)}
                  className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-bold text-lg">{route.code}</td>
                  <td className="p-4 capitalize">
                    {route.user ? `${route.user.firstName} ${route.user.lastName}` : <span className="text-red-500 italic">Unassigned</span>}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-700">
                    {route.totalQuantity} units
                  </td>
                  <td className="p-4 text-right font-bold text-green-600 border-l-2 text-lg">
                    {formatCurrency(route.totalValue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRoute && (
        <ForeignInventoryDetailsModal 
          adminId={userId}
          route={selectedRoute} 
          onClose={() => setSelectedRoute(null)} 
        />
      )}
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
            setMessage("");
            }
          }
          collection="Foreign Inventory"
        />
      )}
    </div>
  );
}