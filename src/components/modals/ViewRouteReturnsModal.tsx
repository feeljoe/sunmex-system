"use client";
import { useMemo } from "react";

export default function ViewRouteReturnsModal({routeData, onClose}: any) {
    const aggregatedProducts = useMemo(() => {
        const map = new Map<string, any>();
    
        routeData.creditMemos.forEach((cm: any) => {
          const docNumber = cm.number || "Unknown CRM";
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

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[400px] lg:w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div className="flex w-full justify-between items-start">
                <div className="text-center w-full">
                    <h2 className="text-2xl font-bold text-center text-green-600">Completed Returns</h2>
                    <p className="text-gray-500 font-semibold">{routeData?.routeName} • Processed Today</p>
                </div>
                <button onClick={onClose} className="text-white bg-red-500 font-bold rounded-xl px-2 hover:bg-red-300 text-2xl cursor-pointer">&times;</button>
              </div>
            </div>
    
            <div className="flex-1 overflow-auto space-y-4 pr-2">
              {aggregatedProducts.map((agg, idx) => (
                  <div key={idx} className="p-4 rounded-xl shadow-md bg-gray-50 flex gap-4 justify-between items-center border-l-4 border-green-500">
                    <div className="w-full">
                      <div className="font-bold">{agg.brandName} {agg.productName}</div>
                      <div className="text-xs font-bold text-blue-600 tracking-wide mt-0.5">
                        Docs: {agg.sourceDocs}
                      </div>
                      <div className="text-sm font-semibold capitalize text-gray-600">{agg.returnReason}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-bold text-gray-500">Processed Count</div>
                        <div className="text-xl font-bold text-green-700">{agg.totalPicked}</div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      );
}