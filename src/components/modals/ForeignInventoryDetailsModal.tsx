"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/format";
import ConfirmInventoryModal from "./ConfirmInventoryModal";

export default function ForeignInventoryDetailsModal({ route, adminId, onClose }: { route: any, adminId: string, onClose: () => void }) {
  if (!route) return null;

  const [showAuditor, setShowAuditor] = useState(false);

  const sortedInventory = [...route.detailedInventory].sort((a: any, b: any) => {
    const pA = a.product;
    const pB = b.product;

    // Safety fallback in case a product was deleted from the database
    if (!pA && !pB) return 0;
    if (!pA) return 1;
    if (!pB) return -1;

    const brandA = pA.brand?.name?.toLowerCase() || "zzz_unassigned"; 
    const brandB = pB.brand?.name?.toLowerCase() || "zzz_unassigned";
    
    if (brandA !== brandB) {
      return brandA.localeCompare(brandB);
    }
    if (b.quantity > 0 && a.quantity > 0) {
        const nameA = pA.name?.toLowerCase() || "";
        const nameB = pB.name?.toLowerCase() || "";
        
        if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
        }
        return (b.quantity || 0) - (a.quantity || 0);
    } else {
        if(b.quantity !== a.quantity){
            return (b.quantity || 0) - (a.quantity || 0);
        }

        const nameA = pA.name?.toLowerCase() || "";
        const nameB = pB.name?.toLowerCase() || "";
        
        if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
        }
    }
  });

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-(--secondary) p-6 rounded-xl shadow-2xl w-[90vw] max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Route {route.code} Inventory Details</h3>
            <p className="font-bold capitalize">
              Assigned to: {route.user ? `${route.user.firstName} ${route.user.lastName}` : "Unassigned"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-auto rounded-xl shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--tertiary) sticky top-0">
              <tr className="whitespace-nowrap font-semibold">
                <th className="p-2">SKU</th>
                <th className="p-2">UPC</th>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">Unit Cost</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Total Line Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item: any, index: number) => {
                const product = item.product;
                if (!product) return null;

                const unitValue = product.unitCost || 0;
                const lineTotal = unitValue * item.quantity;

                return (
                  <tr key={index} className={`border-b bg-white hover:bg-gray-100 whitespace-nowrap ${item.quantity > 0 ? "" : "bg-yellow-50 text-red-700"}`}>
                    <td className="p-3 font-mono">{product.sku || "N/A"}</td>
                    <td className="p-3 font-mono">{product.upc || "N/A"}</td>
                    <td className="p-3 font-bold capitalize">{product.brand?.name?.toLowerCase() || "N/A"}</td>
                    <td className="p-3 font-bold capitalize">
                        {product.name?.toLowerCase()}{" "}
                        {product.weight ? product.weight + product.unit?.toUpperCase(): ""}{" "}
                        {product.caseSize ? product.caseSize + " Units per case": ""}
                    </td>
                    <td className="p-3 text-right text-gray-500">{formatCurrency(unitValue)}</td>
                    <td className="p-3 text-right font-bold">{item.quantity}</td>
                    <td className={`p-3 text-right font-bold ${item.quantity > 0 ? "text-green-700" : "text-red-700"} border-l-2`}>{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Controls */}
        <div className="mt-6 flex justify-between items-center">
            <div>
                <button
                    onClick={() => setShowAuditor(true)}
                    className={`bg-yellow-400 text-yellow-800 font-bold px-5 py-3 rounded-xl cursor-pointer hover:text-white hover:bg-yellow-800 transition-colors duration:500`}>
                    Confirm Inventory
                </button>
            </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${route.totalValue > 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(route.totalValue)}</p>
            <p className="text-xl font-bold">{route.totalQuantity} total units</p>
          </div>
        </div>
      </div>
    </div>
    {showAuditor && (
        <ConfirmInventoryModal
          route={route}
          adminId={adminId} // Pass this prop down from your main table!
          onClose={() => setShowAuditor(false)}
          onCompleted={() => {
            setShowAuditor(false);
            onClose(); // Close the details modal too
          }}
        />
      )}
    </>
  );
}