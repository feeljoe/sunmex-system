"use client";

import { useState, useEffect, useMemo } from "react";
import SignaturePad from "../ui/SignaturePad";
import SubmitResultModal from "./SubmitResultModal";

export default function ReceiveRouteReturnsModal({
  user,
  routeData, // This contains { routeId, routeName, creditMemos: [] }
  onClose,
  onCompleted,
}: any) {
  const [verifiedQuantities, setVerifiedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reasonOverrides, setReasonOverrides] = useState<Record<string,string>>({});

  // Group all products from all Credit Memos by Product + Reason
  const aggregatedProducts = useMemo(() => {
    const map = new Map<string, any>();

    routeData.creditMemos.forEach((cm: any) => {
      const docNumber = cm.number || "unknown CRM";
      cm.products.forEach((p: any) => {
        // SAFEGUARD: Skip if pickedQuantity is 0
        if ((p.pickedQuantity || 0) === 0) return;
        // Unique key per product AND return reason (so good returns don't mix with trash)
        const key = `${p?.product?._id}-${p?.returnReason}`;
        
        if (!map.has(key)) {
          map.set(key, {
            productId: p?.product?._id,
            brandName: p?.product?.brand?.name || "Unknown Brand",
            productName: p?.product?.name || "Unknown Product",
            weight: p?.product?.weight || "",
            unit: p?.product?.unit || "",
            returnReason: p?.returnReason,
            totalPicked: 0,
            sourceDocs: new Set<string>(),
          });
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
            const deviation = p?.deviationReason;
            const key = `${prod?._id}-${p?.deviationReason}-po`;

            if (!map.has(key)) {
                map.set(key, {
                    sourceType: "preorder",
                    productId: prod?._id,
                    brandName: prod?.brand?.name || "Unknown Brand",
                    productName: prod?.name || "Unknown Product",
                    weight: prod?.weight || "",
                    unit: prod?.unit || "",
                    returnReason: deviation,
                    totalPicked: 0,
                    sourceDocs: new Set<string>(),
                });
            }
            map.get(key).totalPicked += diff;
            map.get(key).sourceDocs.add(docNumber);
        });
    });


    return Array.from(map.values()).map(item => ({
      ...item,
      sourceDocs: Array.from(item.sourceDocs).join(", ")
    })).sort((a,b) => {
        if(a.sourceType === "preorder" && b.sourceType !== "preorder") return -1;
        if(a.sourceType !== "preorder" && b.sourceType === "preorder") return 1;

        if(a.returnReason === "returned" && b.returnReason !== "returned") return -1;
        if(a.returnReason !== "returned" && b.returnReason === "returned") return 1;
        if(a.returnReason === "missing" && b.returnReason !== "missing") return -1;
        if(a.returnReason !== "missing" && b.returnReason === "missing") return 1;

        if(a.returnReason === "good return" && b.returnReason !== "good return") return -1;
        if(a.returnReason !== "good return" && b.returnReason === "good return") return 1;

        const brandA = (a.brandName || "").toLowerCase();
        const brandB = (b.brandName || "").toLowerCase();
        if(brandA < brandB) return -1;
        if(brandA > brandB) return 1;

        const nameA = (a.productName || "").toLowerCase();
        const nameB = (b.productName || "").toLowerCase();
        if(nameA < nameB) return -1;
        if(nameA > nameB) return 1;
        
        return 0;
    });
  }, [routeData]);

  // Initialize inputs with the total picked amounts
  useEffect(() => {
    const initialQs: Record<string, number> = {};
    aggregatedProducts.forEach((agg) => {
      const key = `${agg.productId}-${agg.returnReason}-${agg.sourceType === "preorder" ? "po" : "cm"}`;
      initialQs[key] = agg.totalPicked;
    });
    setVerifiedQuantities(initialQs);
  }, [aggregatedProducts]);

  const handleSubmit = async () => {
    if (!signature) {
      alert("Signing is required");
      return;
    }
    try{
    setLoading(true);
    setSubmitStatus("loading");

    const payloadProducts = aggregatedProducts.map((agg) => {
      const key = `${agg.productId}-${agg.returnReason}-${agg.sourceType === "preorder" ? "po" : "cm"}`;
      return {
        sourceType: agg.sourceType || "cm",
        productId: agg.productId,
        originalReason: agg.returnReason,
        newReason: reasonOverrides[key] || agg.returnReason,
        totalPicked: agg.totalPicked,
        verifiedQuantity: verifiedQuantities[key],
      }
    });

    const res = await fetch("/api/warehouse/returns/bulk-complete", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditMemoIds: routeData.creditMemos.map((cm: any) => cm._id),
        preorderIds: routeData.preorders.map((po: any) => po._id),
        aggregatedProducts: payloadProducts,
        warehouseUser: user?.id,
        driverSignature: signature,
        warehouseSignature: user?.firstName + " " + user?.lastName,
      }),
    });

    setLoading(false);

    if (res.ok) {
        setMessage("Receiving complete!");
        setSubmitStatus("success");
    }
    } catch(err: any) {
        console.error("Could not complete receiving: ", err.message);
        setSubmitStatus("error");
        setMessage(`Failed to complete receiving. ${err.message}`);
    } finally {
        setMessage("");
        onCompleted();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[400px] lg:w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div className="flex w-full justify-between items-start">
            <div className="text-center w-full">
            <h2 className="text-2xl font-bold text-center">Receive Returns</h2>
            <p className="text-gray-500 font-semibold">{routeData?.routeName} • {routeData?.creditMemos?.length + routeData?.preorders?.length} Pending Documents</p>
            </div>
            <button onClick={onClose} className="text-white bg-red-500 font-bold rounded-xl px-2 hover:bg-red-300 text-2xl cursor-pointer transition-colors">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4 pr-2">
          {aggregatedProducts.map((agg) => {
            const key = `${agg.productId}-${agg.returnReason}-${agg.sourceType === "preorder" ? "po" : "cm"}`;
            const isMissing = verifiedQuantities[key] < agg.totalPicked;

            return (
              <div key={key} className="p-4 rounded-xl shadow-xl bg-gray-50 flex gap-4 justify-between items-center">
                <div className="w-full">
                  <div className="font-bold">{agg.brandName} {agg.productName} {agg.weight ? (`${agg.weight}${agg.unit?.toUpperCase()}`) : ""}</div>
                  <div className="text-xs font-bold text-blue-600 tracking-wide mt-0.5">
                    Docs: {agg.sourceDocs}
                  </div>
                  <div className={`mt-1`}>
                    <select
                      value={reasonOverrides[key] || agg.returnReason}
                      onChange={(e) => setReasonOverrides(prev => ({...prev, [key]: e.target.value}))}
                      className={`text-sm font-bold capitalize outline-hidden border-b-2 bg-transparent cursor-pointer ${
                        (reasonOverrides[key] || agg.returnReason) === 'good return' || (reasonOverrides[key] || agg.returnReason) === 'returned' 
                        ? 'text-green-600 border-green-600' : 'text-orange-500 border-orange-500'
                      }`}
                    >
                      {agg.sourceType === "preorder" ? (
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
                    {agg.sourceType === "preorder" && (
                        <span className="ml-4 bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Preorder Dev.</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Total Expected: {agg.totalPicked}</div>
                </div>

                <div className="flex items-center">
                  <div className="text-center grid grid-cols gap-1">
                    <label className="text-xs font-bold text-gray-500">Actual Count</label>
                    <input
                      type="number"
                      min={0}
                      max={agg.totalPicked} // Prevent over-receiving
                      value={verifiedQuantities[key] ?? ""}
                      onChange={(e) => setVerifiedQuantities(prev => ({
                        ...prev,
                        [key]: Math.round(Number(e.target.value) || 0)
                      }))}
                      className={`w-24 h-10 text-center border rounded-lg focus:ring-2 outline-hidden ${isMissing ? 'border-red-500 bg-red-50' : ''}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between pt-4 gap-4">
        <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors cursor-pointer">
            Cancel
        </button>
        <button 
            onClick={() => setConfirming((prev) => !prev)} 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
        >
            {loading ? "Processing..." : "Complete Receiving"}
        </button>
        </div>
      </div>
      { confirming && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-4/5 max-w-xl lg:max-w-2xl h-auto">
                  <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-semibold w-full text-center">Confirm Product Devolution</h3>
                  <button
                      onClick={() => {setConfirming(false); setSignature(null);}}
                      className="text-white bg-red-500 rounded-xl px-4 py-2 text-xl font-bold hover:text-black"
                  >
                      ✕
                  </button>
                  </div>
                  <SignaturePad onSave={setSignature} />
          
                  <div className="flex justify-end gap-5 pt-4">
                      <button
                        disabled={!signature || loading}
                        className="bg-green-600 text-white px-5 py-3 rounded-xl disabled:opacity-50 cursor-pointer shadow-xl"
                        onClick={() => {handleSubmit(); setSubmitStatus("loading");}}
                      >
                      Done
                      </button>
                  </div>
                  </div>
              </div>
        )}
        {submitStatus && (
            <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => setSubmitStatus(null)}
            collection=""
            />
        )}
    </div>
  );
}