"use client";
import { useMemo } from "react";

export default function ViewRouteReturnsModal({routeData, onClose}: any) {
    const aggregatedProducts = useMemo(() => {
        const map = new Map<string, any>();
        const getAggKey = (productId: string, reason: string, type: string) => `${productId}-${reason}-${type}`;
    
        routeData.creditMemos.forEach((cm: any) => {
          const docNumber = cm.number || "Unknown CRM";
          cm.products.forEach((p: any) => {
            if ((p.pickedQuantity || 0) === 0) return;
            const key = getAggKey(p?.product?._id, p?.returnReason, "cm");
            
            if (!map.has(key)) map.set(key, { sourceType: "cm", productId: p?.product?._id, brandName: p?.product?.brand?.name || "Unknown Brand", productName: p?.product?.name || "Unknown Product", weight: p?.product?.weight || "", unit: p?.product?.unit || "", returnReason: p?.returnReason, totalPicked: 0, sourceDocs: new Set<string>() });
            
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
    
                if (!map.has(key)) map.set(key, { sourceType: "po", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.deviationReason, totalPicked: 0, sourceDocs: new Set<string>() });
                map.get(key).totalPicked += diff;
                map.get(key).sourceDocs.add(docNumber);
            });
        });

        routeData.loadRequests?.forEach((lr: any) => {
            const docNumber = lr.LRNumber || "Unknown LR";
              lr.products.forEach((p: any) => {
                  if (!p?.differenceReason) return;
                  const diff = Math.round((p.assembledQuantity || 0) - (p.deliveredQuantity || 0));
                  const prod = p?.product;
                  const key = getAggKey(prod?._id, p?.differenceReason, "lr");
                  
                  if (!map.has(key)) map.set(key, { sourceType: "lr", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.differenceReason, totalPicked: 0, sourceDocs: new Set<string>() });
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
    
            if (!map.has(key)) map.set(key, { sourceType: "au", productId: prod?._id, brandName: prod?.brand?.name || "Unknown Brand", productName: prod?.name || "Unknown Product", weight: prod?.weight || "", unit: prod?.unit || "", returnReason: p?.reason, totalPicked: 0, sourceDocs: new Set<string>() });
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

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[400px] lg:w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div className="flex w-full justify-between items-start">
                <div className="text-center w-full">
                    <h2 className="text-2xl font-bold text-center text-green-600">Completed Returns</h2>
                    <p className="text-gray-500 font-semibold">{routeData?.routeName} • Processed</p>
                </div>
                <button onClick={onClose} className="text-white bg-red-500 font-bold rounded-xl px-2 hover:bg-red-300 text-2xl cursor-pointer">&times;</button>
              </div>
            </div>
    
            <div className="flex-1 overflow-auto space-y-4 pr-2">
              {aggregatedProducts.map((agg, idx) => (
                  <div key={idx} className="p-4 rounded-xl shadow-md bg-gray-50 flex gap-4 justify-between items-center border-l-4 border-green-500">
                    <div className="w-full">
                      <div className="font-bold">{agg.brandName} {agg.productName} {agg.weight ? (`${agg.weight}${agg.unit?.toUpperCase()}`) : ""}</div>
                      <div className="text-xs font-bold text-blue-600 tracking-wide mt-0.5">Docs: {agg.sourceDocs}</div>
                      <div className="text-sm font-bold capitalize text-gray-600 mt-1 flex items-center gap-2">
                        {agg.returnReason}
                        {agg.sourceType === "po" && <span className="bg-blue-200 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Preorder</span>}
                        {agg.sourceType === "lr" && <span className="bg-indigo-200 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Load Req</span>}
                      </div>
                    </div>
                    <div className="text-center min-w-[100px]">
                        <div className="text-xs font-bold text-gray-500">Processed Count</div>
                        <div className="text-2xl font-bold text-green-700">{agg.totalPicked}</div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      );
}