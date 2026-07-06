"use client";
import { useState } from "react";
import { formatCurrency } from "@/utils/format";
import SubmitResultModal from "./SubmitResultModal";

export default function ConfirmInventoryModal({
    route,
    adminId,
    onClose,
    onCompleted,
}: {
    route: any;
    adminId: string;
    onClose: () => void;
    onCompleted: () => void;
}) {
    const [step, setStep] = useState<"audit" | "summary">("audit");
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
    const [message, setMessage] = useState("");

    const [auditItems, setAuditItems] = useState(() => 
        route.detailedInventory.map((item: any) => ({
            productId: item.product._id,
            sku: item.product.sku,
            brand: item.product.brand?.name || "N/A",
            name: item.product.name,
            unitCost: item.product.unitCost || 0,
            weight: item.product.weight,
            unit: item.product.unit,
            caseSize: item.product.caseSize,
            expectedQty: item.quantity,
            actualQty: item.quantity,
            reason: "",
            adjusted: false,
        }))
    );

    const [selectedDeductions, setSelectedDeductions] = useState<string[]>([]);

    const handleQtyChange = (productId: string, val: string) => {
        const num = parseInt(val) || 0;
        setAuditItems((prev: any[]) => prev.map(item => {
            if (item.productId === productId) {
                const isAdjusted = num !== item.expectedQty;
                return {
                    ...item,
                    actualQty: num,
                    adjusted: isAdjusted,
                    reason: isAdjusted ? item.reason: ""
                };
            }
            return item;
        }));
    };

    const handleReasonChange = (productId: string, reason: string) => {
        setAuditItems((prev: any[]) => prev.map(item =>
            item.productId === productId ? {...item, reason} : item
        ));
    };

    const toggleDeduction = (productId: string) => {
        setSelectedDeductions(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleReview = () => {
        const missingReasons = auditItems.find((item: { adjusted: any; reason: any; }) => item.adjusted && !item.reason);
        if (missingReasons) {
            setMessage("Please select a reason for all adjusted quantities.");
            setSubmitStatus("info");
            return;
        }

        const defaultDeductions = auditItems
            .filter((item: { adjusted: any; actualQty: number; expectedQty: number; }) => item.adjusted && item.actualQty < item.expectedQty)
            .map((item: { productId: any; }) => item.productId);
        
        setSelectedDeductions(defaultDeductions);
        setStep("summary");
    };

    const handleSubmit = async () => {
        setSubmitStatus("loading");
        const itemsToDeduct = auditItems.filter((item: { productId: string; }) => selectedDeductions.includes(item.productId));

        try {
            const res = await fetch(`/api/routes/${route._id}/audit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    updatedInventory: auditItems,
                    deductions: itemsToDeduct,
                    routeUserId: route.user?._id,
                    adminId: adminId
                })
            });
            if (res.ok) {
                setMessage("Audit Submitted");
                setSubmitStatus("success");
                onCompleted();
            }else {
                setMessage("Failed to submit Audit");
                setSubmitStatus("error");
            }
        } catch (error: any) {
            console.error("Audit Error: ", error);
            setMessage("Failed to submit Audit");
            setSubmitStatus("error");
        }
    };

    const differences = auditItems.filter((item: { adjusted: any; }) => item.adjusted);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-(--secondary) p-6 rounded-xl shadow-2xl w-[90vw] max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="text-center border-b pb-4 mb-4">
              <h2 className="font-semibold text-2xl text-gray-800">
                {step === "audit" ? "Audit Route Inventory" : "Audit Summary & Deductions"}
              </h2>
              <p className="text-gray-500 font-bold capitalize">Route {route.code} - {route.user?.firstName} {route.user?.lastName}</p>
            </div>
    
            {/* --- STEP 1: AUDIT MODE --- */}
            {step === "audit" && (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 p-2">
                  {auditItems.map((item: any) => (
                    <div key={item.productId} className={`flex items-center gap-4 p-4 rounded-xl shadow-sm border ${item.adjusted ? "bg-yellow-50 border-yellow-200" : "bg-white"}`}>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{item.brand} - {item.name} {item.weight ? `| ${item.weight}${item.unit?.toUpperCase()}` : ""} {item.caseSize ? `| ${item.caseSize} units per case` : ""}</p>
                        <p className="text-sm text-gray-500 font-mono">SKU: {item.sku} | Cost: {formatCurrency(item.unitCost)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase">Expected</p>
                          <p className="text-xl h-10 font-bold p-1">{item.expectedQty}</p>
                        </div>
                        
                        <span className="text-gray-300 mx-2">→</span>
    
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase">Actual Found</p>
                          <input 
                            type="number" 
                            min="0"
                            value={item.actualQty === 0 ? "" : item.actualQty}
                            onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                            className="w-20 text-center font-bold text-xl border-2 border-gray-300 rounded-lg p-1 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
    
                      {/* Inline Reason Dropdown (Only shows if adjusted) */}
                      {item.adjusted && (
                        <div className="w-48 text-xs font-bold">
                            <label>DIFFERENCE REASON</label>
                          <select 
                            value={item.reason} 
                            onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                            className={`w-full h-10 p-2 border-2 rounded-lg font-bold text-sm outline-none ${!item.reason ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300 bg-white"}`}
                          >
                            <option value="" disabled>Select Reason...</option>
                            <option value="extra">Extra</option>
                            <option value="missing">Missing</option>
                            <option value="damaged">Damaged</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
    
                <div className="flex justify-between items-center mt-6 border-t pt-4">
                  <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300">Cancel</button>
                  <button 
                    onClick={handleReview}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg"
                  >
                    Review Differences
                  </button>
                </div>
              </>
            )}
    
            {/* --- STEP 2: SUMMARY & DEDUCTIONS MODE --- */}
            {step === "summary" && (
              <>
                {differences.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-10">
                    <p className="text-2xl font-bold text-green-600 mb-2">Perfect Audit!</p>
                    <p className="text-gray-500">No discrepancies found in the inventory.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <p className="text-red-600 font-bold mb-4 text-center">
                      Select which missing/damaged items should be sent to payroll deductions.
                    </p>
                    
                    <table className="w-full text-left bg-white rounded-xl shadow-sm border overflow-hidden">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="p-3 text-center">Deduct?</th>
                          <th className="p-3 font-semibold">Product</th>
                          <th className="p-3 font-semibold text-center">Difference</th>
                          <th className="p-3 font-semibold">Reason</th>
                          <th className="p-3 font-semibold text-right">Deduction Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {differences.map((item: any) => {
                          const qtyDiff = item.expectedQty - item.actualQty;
                          const costDiff = qtyDiff * item.unitCost;
                          const isSelected = selectedDeductions.includes(item.productId);
                          
                          return (
                            <tr key={item.productId} className={`border-b ${isSelected ? "bg-red-200" : ""}`}>
                              <td className="p-3 text-center">
                                {qtyDiff > 0 && ( // Only allow deductions if they are missing/short items
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleDeduction(item.productId)}
                                    className="w-8 h-8 cursor-pointer accent-red-600"
                                  />
                                )}
                              </td>
                              <td className="p-3 font-bold">{item.brand} - {item.name} {item.weight ? `| ${item.weight}${item.unit?.toUpperCase()}` : ""} {item.caseSize ? `| ${item.caseSize} units per case` : ""}</td>
                              <td className={`p-3 text-center font-bold ${qtyDiff > 0 ? "text-red-600" : "text-green-600"}`}>{-qtyDiff}</td>
                              <td className="p-3 capitalize font-semibold text-gray-600">{item.reason}</td>
                              <td className={`p-3 text-right font-bold ${qtyDiff > 0 ? "text-red-600" : "text-green-600"}`}>
                                {qtyDiff > 0 ? formatCurrency(costDiff) : "$0.00"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
    
                <div className="flex justify-between items-center mt-6 border-t pt-4">
                  <button onClick={() => setStep("audit")} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300">Back</button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitStatus !== null ? true : false}
                    className="px-6 py-2 bg-green-400 text-green-800 rounded-xl font-bold hover:bg-green-800 hover:text-white shadow-lg disabled:opacity-50 flex gap-2 items-center cursor-pointer transition-colors duration:500"
                  >
                    {submitStatus ? "Processing..." : "Confirm & Finalize Audit"}
                  </button>
                </div>
              </>
            )}
            {submitStatus && (
                <SubmitResultModal
                    message={message}
                    status={submitStatus}
                    onClose={() => setSubmitStatus(null)}
                    collection="Audit"
                />
            )}
          </div>
        </div>
      );
}