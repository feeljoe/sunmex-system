"use client";

import { useState, useEffect, useMemo } from "react";
import SignaturePad from "../ui/SignaturePad";
import SubmitResultModal from "./SubmitResultModal";
import { Status } from "./SubmitResultModal";

export default function ReceiveRouteReturnsModal({ user, routeData, onClose, onCompleted }: any) {
  const [verifiedQuantities, setVerifiedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reasonOverrides, setReasonOverrides] = useState<Record<string,string>>({});

  // Centralized key generator so it mathematically matches everywhere!
  const getAggKey = (productId: string, reason: string, type: string) => `${productId}-${reason}-${type}`;

  const aggregatedProducts = useMemo(() => {
    const map = new Map<string, any>();

    routeData.creditMemos.forEach((cm: any) => {
      const docNumber = cm.number || "unknown CRM";
      cm.products.forEach((p: any) => {
        if ((p.pickedQuantity || 0) === 0) return;
        const key = getAggKey(p?.product?._id, p?.returnReason, "cm");
        
        if (!map.has(key)) {
          map.set(key, { sourceType: "cm", productId: p?.product?._id, brandName: p?.product?.brand?.name || "Unknown Brand", productName: p?.product?.name || "Unknown Product", weight: p?.product?.weight || "", unit: p?.product?.unit || "", returnReason: p?.returnReason, totalPicked: 0, sourceDocs: new Set<string>() });
        }
        map.get(key).totalPicked += Math.round((p?.pickedQuantity || 0));
        map.get(key).sourceDocs.add(docNumber);
      });
    });

    routeData.preorders.forEach((po: any) => {
      const docNumber = po.number || "Unknown INV";
        po.products.forEach((p: any) => {
            if (!p?.deviationReason) return;
            const diff = Math.round((p.pickedQuantity || 0) - (p.deliveredQuantity || 0));
            const prod = p?.productInventory?.product || p?.product;
            const key = getAggKey(prod?._id, p?.deviationReason, "po");
            
            if (!map.has(key)) {
                map.set(key, { sourceType: "po", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.deviationReason, totalPicked: 0, sourceDocs: new Set<string>() });
            }
            map.get(key).totalPicked += diff;
            map.get(key).sourceDocs.add(docNumber);
        });
    });

    // NEW: Load Requests
    routeData.loadRequests?.forEach((lr: any) => {
      const docNumber = lr.LRNumber || "Unknown LR";
        lr.products.forEach((p: any) => {
            if (!p?.differenceReason) return;
            const diff = Math.round((p.assembledQuantity || 0) - (p.deliveredQuantity || 0));
            const prod = p?.product;
            const key = getAggKey(prod?._id, p?.differenceReason, "lr");
            
            if (!map.has(key)) {
                map.set(key, { sourceType: "lr", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.differenceReason, totalPicked: 0, sourceDocs: new Set<string>() });
            }
            map.get(key).totalPicked += diff;
            map.get(key).sourceDocs.add(docNumber);
        });
    });

    routeData.audits?.forEach((au: any) => {
      const docNumber = "AUDIT";
      au.products.forEach((p: any) => {
        const diff = Math.abs(p.difference);
        const prod = p?.product;
        const key = getAggKey(prod?._id, p?.reason, "au");

        if (!map.has(key)) {
          map.set(key, { sourceType: "au", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.reason, totalPicked: 0, sourceDocs: new Set<string>() });
        }
        map.get(key).totalPicked += diff;
        map.get(key).sourceDocs.add(docNumber);
      });
    });

    return Array.from(map.values()).map(item => ({
      ...item, sourceDocs: Array.from(item.sourceDocs).join(", ")
    })).sort((a,b) => {
        if(a.sourceType === "po" && b.sourceType !== "po") return -1;
        if(a.sourceType !== "po" && b.sourceType === "po") return 1;
        if(a.returnReason === "returned" && b.returnReason !== "returned") return -1;
        if(a.returnReason !== "returned" && b.returnReason === "returned") return 1;
        if(a.returnReason === "missing" && b.returnReason !== "missing") return -1;
        if(a.returnReason !== "missing" && b.returnReason === "missing") return 1;
        if(a.returnReason === "good return" && b.returnReason !== "good return") return -1;
        if(a.returnReason !== "good return" && b.returnReason === "good return") return 1;

        const brandA = (a.brandName || "").toLowerCase();
        const brandB = (b.brandName || "").toLowerCase();
        if(brandA !== brandB) return brandA.localeCompare(brandB);

        const nameA = (a.productName || "").toLowerCase();
        const nameB = (b.productName || "").toLowerCase();
        return nameA.localeCompare(nameB);
    });
  }, [routeData]);

  useEffect(() => {
    const initialQs: Record<string, number> = {};
    aggregatedProducts.forEach((agg) => {
      initialQs[getAggKey(agg.productId, agg.returnReason, agg.sourceType)] = agg.totalPicked;
    });
    setVerifiedQuantities(initialQs);
  }, [aggregatedProducts]);

  const handleSubmit = async () => {
    if (!signature) { alert("Signing is required"); return; }
    
    setLoading(true);
    setSubmitStatus("loading-warehouse"); // 🔥 Triggers animated cardboard box!
    
    try {
      const payloadProducts = aggregatedProducts.map((agg) => {
        const key = getAggKey(agg.productId, agg.returnReason, agg.sourceType);
        return {
          sourceType: agg.sourceType || "cm",
          productId: agg.productId,
          originalReason: agg.returnReason,
          newReason: reasonOverrides[key] || agg.returnReason,
          totalPicked: agg.totalPicked,
          verifiedQuantity: verifiedQuantities[key],
        }
      });

      // 1. Create API Promise
      const apiCall = fetch("/api/warehouse/returns/bulk-complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditMemoIds: routeData.creditMemos.map((cm: any) => cm._id) || [],
          preorderIds: routeData.preorders.map((po: any) => po._id) || [],
          loadRequestIds: routeData.loadRequests?.map((lr: any) => lr._id) || [], // 🔥 Passed for backend to process
          auditIds: routeData.audits?.map((au: any) => au._id) || [],
          aggregatedProducts: payloadProducts,
          warehouseUser: user?.id,
          driverSignature: signature,
          warehouseSignature: user?.name,
        }),
      });

      // 2. 3-Second UI Guarantee Promise
      const minLoader = new Promise(resolve => setTimeout(resolve, 3000));
      const [res] = await Promise.all([apiCall, minLoader]);

      if (!res.ok) throw new Error((await res.json()).error || "Failed to process returns");
      
      setSubmitStatus("success-warehouse");
      setMessage("Receiving complete!");
    } catch(err: any) {
        setSubmitStatus("error-warehouse");
        setMessage(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[400px] lg:w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div className="flex w-full justify-between items-start">
            <div className="text-center w-full">
            <h2 className="text-2xl font-bold text-center">Receive Returns</h2>
            <p className="text-gray-500 font-semibold">{routeData?.routeName} • {routeData?.creditMemos?.length + routeData?.preorders?.length + (routeData?.loadRequests?.length || 0)} Pending Documents</p>
            </div>
            <button onClick={onClose} className="text-white bg-red-500 font-bold rounded-xl px-2 hover:bg-red-300 text-2xl cursor-pointer transition-colors">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4 pr-2">
          {aggregatedProducts.map((agg) => {
            const key = getAggKey(agg.productId, agg.returnReason, agg.sourceType);
            const isMissing = verifiedQuantities[key] < agg.totalPicked;

            return (
              <div key={key} className="p-4 rounded-xl shadow-xl bg-gray-50 flex gap-4 justify-between items-center">
                <div className="w-full">
                  <div className="font-bold">{agg.brandName} {agg.productName} {agg.weight ? (`${agg.weight}${agg.unit?.toUpperCase()}`) : ""}</div>
                  <div className="text-xs font-bold text-blue-600 tracking-wide mt-0.5">Docs: {agg.sourceDocs}</div>
                  <div className={`mt-1`}>
                    {agg.sourceType !== "au" ?(
                    <select
                      value={reasonOverrides[key] || agg.returnReason}
                      onChange={(e) => setReasonOverrides(prev => ({...prev, [key]: e.target.value}))}
                      className={`text-sm font-bold capitalize outline-hidden border-b-2 bg-transparent cursor-pointer ${
                        (reasonOverrides[key] || agg.returnReason) === 'good return' || (reasonOverrides[key] || agg.returnReason) === 'returned' 
                        ? 'text-green-600 border-green-600' : 'text-orange-500 border-orange-500'
                      }`}
                    >
                      {agg.sourceType === "po" || agg.sourceType === "lr" ? (
                            <>
                                <option value="returned">Returned</option>
                                <option value="damaged">Damaged</option>
                                <option value="missing">Missing</option>
                            </>
                        ) : (
                            <>
                                <option value="good return">Good Return</option>
                                <option value="credit memo">Credit Memo</option>
                            </>
                        )}
                    </select>
                    ): (
                      <span className="text-sm font-bold capitalize border-b-2 bg-transparent text-green-600 border-green-600">Return to Warehouse</span>
                    )}
                    {agg.sourceType === "po" && <span className="ml-4 bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Preorder Dev.</span>}
                    {agg.sourceType === "lr" && <span className="ml-4 bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Load Req Dev.</span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Total Expected: {agg.totalPicked}</div>
                </div>

                <div className="flex items-center">
                  <div className="text-center grid grid-cols gap-1">
                    <label className="text-xs font-bold text-gray-500">Actual Count</label>
                    <input type="number" min={0} max={agg.totalPicked} value={verifiedQuantities[key] ?? ""} onChange={(e) => setVerifiedQuantities(prev => ({ ...prev, [key]: Math.round(Number(e.target.value) || 0) }))} className={`w-24 h-10 text-center border rounded-lg focus:ring-2 outline-hidden ${isMissing ? 'border-red-500 bg-red-50' : ''}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between pt-4 gap-4">
        <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors cursor-pointer font-bold">Cancel</button>
        <button onClick={() => setConfirming(true)} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer">{loading ? "Processing..." : "Complete Receiving"}</button>
        </div>
      </div>
      { confirming && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-4/5 max-w-xl lg:max-w-2xl h-auto">
                  <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-semibold w-full text-center">Confirm Product Devolution</h3>
                  <button onClick={() => {setConfirming(false); setSignature(null);}} className="text-white bg-red-500 rounded-xl px-4 py-2 text-xl font-bold hover:text-black cursor-pointer">✕</button>
                  </div>
                  <SignaturePad onSave={setSignature} />
          
                  <div className="flex justify-end gap-5 pt-4">
                      <button disabled={!signature || loading} className="bg-green-600 font-bold text-white px-5 py-3 rounded-xl disabled:opacity-50 cursor-pointer shadow-xl" onClick={handleSubmit}>Done</button>
                  </div>
                  </div>
              </div>
        )}
        {submitStatus && 
          <SubmitResultModal 
            status={submitStatus} 
            message={message} 
            onClose={() => { 
              setSubmitStatus(null); 
              if (submitStatus === "success-warehouse") onCompleted(); 
            }} 
            collection="Route returns" 
          />
        }
    </div>
  );
}