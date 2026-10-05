// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";
import { useMemo, useRef, useState, useEffect } from "react";
import { applyPricingLists } from "@/utils/applyPricingLists";
import { formatCurrency } from "@/utils/format";

export default function StepAddProducts({
  userRole,
  products,
  setProducts,
  preorderStatus,
  invalidProducts,
  pricingLists,
  selectedClient,
  outstandingBalance,
  preorderId,
}: {
  userRole: string;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  preorderStatus: string;
  invalidProducts: string[];
  pricingLists: any[];
  selectedClient: any;
  outstandingBalance?: { total: number, invoices: string[] } | null;
  preorderId?: string;
}) {
  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<HTMLInputElement[]>([]);

  const showPicked = preorderStatus === "ready" || preorderStatus === "delivered";
  const showDelivered = preorderStatus === "delivered";

  const [searchMode, setSearchMode] = useState<"product" | "brand"> ("product");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inventorySearch, setInventorySearch] = useState("");

  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({});
  const toggleBrand = (brand: string) => {
    setCollapsedBrands(prev => ({
      ...prev,
      [brand]: !prev[brand]
    }));
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inventorySearch, searchMode]);
  
  const { items: inventory, loading: loadingInventory } = useList(
    searchMode === "product" ? '/api/productInventory' : "", 
    searchMode === "product" ? { search: inventorySearch || undefined, limit: 50, preorderId: preorderId || undefined, } : {}
  );

  const availableProducts = useMemo(() => {
    return (inventory || []).filter(
      (inv: any) =>
        inv.currentInventory > 0 &&
      !products.some((p) => p.inventoryId === inv._id)
    );
  }, [inventory, products]);

  const { items: brands, loading: loadingBrands } = useList(
    searchMode === "brand" ? '/api/brands' : "", 
    searchMode === "brand" ? { search: inventorySearch || undefined, limit: 1000 } : {}
  );

  const addProduct = (inv: any) => {
    const rawProduct = {
      productId: inv.product._id,
      brandId: inv.product.brand?._id,
      unitPrice: inv.product.unitPrice,
    };

    const applied = applyPricingLists([rawProduct], selectedClient, pricingLists)[0];
    const finalPrice = applied.effectiveUnitPrice ?? inv.product.unitPrice ?? 0;

    setProducts((prev) => [
      {
        inventoryId: inv._id,
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: finalPrice,
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        pickedQuantity: 0,
        deliveredQuantity: 0,
        deviationReason: "",
        maxQty: inv.currentInventory,
      },
      ...prev,
    ]);

    setInventorySearch("");
  };

  const addBrandProducts = async (brand: any) => {
    const res = await fetch(`/api/productInventory?brand=${brand._id}&availableOnly=true&limit=200`);
    const data = await res.json();

    if (!data.items) return;

    const sorted = [...data.items].sort((a, b) =>
      a.product.name.localeCompare(b.product.name)
    );

    setProducts((prev) => {
      const filtered = sorted.filter(inv => !prev.some(p => p.inventoryId === inv._id));

      const rawBatch = filtered.map(inv => ({
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        unitPrice: inv.product.unitPrice,
      }));

      const pricedBatch = applyPricingLists(rawBatch, selectedClient, pricingLists);

      const finalMapped = filtered.map((inv, index) => ({
        inventoryId: inv._id,
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: pricedBatch[index].effectiveUnitPrice ?? inv.product.unitPrice ?? 0,
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        pickedQuantity: 0,
        deliveredQuantity: 0,
        deviationReason: "",
        maxQty: inv.currentInventory,
      }));
      return [...finalMapped, ...prev];
    });
    setInventorySearch("");
  };

  const updateQty = (inventoryId: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.inventoryId === inventoryId
          ? { ...p, quantity: Math.min(Math.max(0, qty), p.maxQty) }
          : p
      )
    );
  };

  const removeProduct=(inventoryId: string) => {
    setProducts((prev) => prev.filter((p) => p.inventoryId !== inventoryId))
  };

  const groupedProducts = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    products.forEach((p) => {
      const brandName = p.brand || "No Brand";
      if (!grouped[brandName]) grouped[brandName] = [];
      grouped[brandName].push(p);
    });

    Object.keys(grouped).forEach((brand) => {
      grouped[brand].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [products]);
  
  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      
      {/* HEADER SECTION (Shrinks to exact size needed) */}
      <div className="space-y-1 flex w-full flex-col">
        <h2 className="text-xl font-semibold text-center">Add Products</h2>

        {outstandingBalance && outstandingBalance.total > 0 && (
          <div className="flex justify-center">
            <div className="w-[80vw] md:w-1/3 flex items-center justify-between bg-red-100 border border-red-500 text-red-800 p-2 rounded-xl shadow-md text-center text-xs md:text-sm mb-2 font-mono">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-yellow-800 bg-yellow-400 border-2 border-yellow-800 p-2 rounded-full flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex flex-col flex-wrap">
                 <span className="font-bold uppercase tracking-wider block mb-1">Client Balance Alert</span>
                 <span className="font-bold text-red-600">Client has an outstanding balance of {formatCurrency(outstandingBalance.total)}.</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-yellow-800 bg-yellow-400 border-2 border-yellow-800 p-2 rounded-full flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        )}

        {/* Toggle mode */}
        <div className="flex gap-2 justify-center">
          <button type="button" onClick={() => { setSearchMode("product"); setInventorySearch(""); }} className={`px-4 py-1 rounded-xl shadow-xl font-bold cursor-pointer transition-colors ${searchMode === "product" ? "bg-blue-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}>
            Products
          </button>
          <button type="button" onClick={() => { setSearchMode("brand"); setInventorySearch(""); }} className={`px-4 py-1 rounded-xl shadow-xl font-bold cursor-pointer transition-colors ${searchMode === "brand" ? "bg-blue-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}>
            Brand
          </button>
        </div>
        
        {/* Product select + add button */}
          <div className="relative">
            <input 
              ref= {inventoryInputRef}
              type="text"
              placeholder={ searchMode === "product" ? "Search Products..." : "Search Brands ..." }
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              onKeyDown={(e) => {
                if(!inventorySearch || availableProducts.length === 0) return;
                if(e.key === "ArrowDown"){ e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, availableProducts.length -1)); }
                if(e.key === "ArrowUp"){ e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
                if(e.key === "Enter"){
                  e.preventDefault();
                  const inv = availableProducts[highlightedIndex];
                  if(!inv) return;
                  addProduct(inv);
                  setTimeout(() => { qtyInputRefs.current[0]?.focus(); }, 0);
                }
              }}
              className="w-full h-10 px-3 rounded-xl bg-white shadow-xl outline-none" 
            />
            {inventorySearch.trim() && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y">
                {searchMode === "product" &&
                  availableProducts.map((inv, index) => (
                    <button key={inv._id} type="button" onMouseEnter={() => setHighlightedIndex(index)} onClick={() => addProduct(inv)} className={`w-full text-left p-3 capitalize ${index === highlightedIndex? "bg-gray-200": "hover:bg-gray-100"} transition-all duration:500 cursor-pointer`}>
                      <div className="font-medium capitalize font-bold">
                        {inv.product.brand?.name}{" "} {inv.product.name}{" "} ({inv.product.weight}{inv.product.unit?.toUpperCase()})
                      </div>
                      <div className="text-sm text-gray-500 font-bold">
                        SKU: {inv.product.sku} | Available:{" "} {Math.round(inv.currentInventory)}
                      </div>
                    </button>
                ))}
                {searchMode === "brand" &&
                  brands.map((brand: any) => (
                    <button key={brand._id} type="button" onClick={() => addBrandProducts(brand)} className="w-full text-left font-bold p-3 hover:bg-gray-100 capitalize cursor-pointer">
                      {brand.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
      </div>
      
      {/* LIST SECTION (Now perfectly fills the remaining space WITHOUT chopping) */}
      <div className="mt-2 flex flex-col h-[50vh] md:h-[60vh] overflow-auto">
        {Object.entries(groupedProducts).map(([brand, brandProducts]) => {
          const isCollapsed = collapsedBrands[brand];
          return (
            <div key={brand} className="mt-2">
              <div onClick={() => toggleBrand(brand)} className="bg-gray-300 px-4 py-2 rounded-xl font-bold capitalize flex justify-between items-center cursor-pointer hover:bg-gray-400 transition-colors">
                <span>{brand} ({brandProducts.length})</span>
                <span className="text-lg">{isCollapsed ? "▸" : "▾"}</span>
              </div>

              {!isCollapsed &&
              <div className="bg-white shadow-xl rounded-xl mb-4 overflow-auto">
                {brandProducts.map((p: any, i: number) => (
                  <div key={p.inventoryId} className={`flex justify-between rounded-xl px-2 gap-3 mt-3 border-2 transition-all ${invalidProducts?.includes(p.inventoryId) ? "border-red-500 bg-red-100" : "bg-white border-transparent"}`}>
                    <div className="flex flex-col text-left w-full">
                      <span className="mt-2 capitalize font-bold">
                        {p.brand?.toLowerCase()} {p.name?.toLowerCase()} {p.weight} {p.unit?.toUpperCase()} {p.caseSize ? `(${p.caseSize} Units per case)` : ""}
                      </span>
                      <span className="text-gray-400 text-xs font-bold">
                        SKU: {p.sku} | Available: {Math.round(p.maxQty)}
                      </span>
                    </div>
                    <div className={`grid ${userRole === "admin" ? "grid-cols-2 md:flex": "flex"} justify-between items-center whitespace-nowrap gap-2`}>
                      <div className="flex flex-col items-center justify-center">
                      <b>QTY</b>
                      <input type="number" inputMode="numeric" min={0} max={Math.round(p.maxQty)} value={p.quantity || ""} onChange={(e) => updateQty(p.inventoryId, Math.round(Number(e.target.value) || 0))} className="bg-gray-200 text-center font-bold outline-none p-2 shadow-xl rounded-xl" />
                      </div>
                      {userRole === "admin" && showPicked &&(
                        <div className="flex flex-col items-center justify-center">
                        <b>PICKED</b>
                        <input type="number" min={0} max={Math.round(p.maxQty)} value={p.pickedQuantity ?? ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, pickedQuantity: Math.min(Math.max(0, Math.round(Number(e.target.value) || 0)), prod.quantity) } : prod )) } className="bg-green-200 font-bold outline-none text-center p-2 shadow-xl rounded-xl" />
                        </div>
                      )}
                      {userRole === "admin" && showDelivered &&(
                        <>
                        <div className="flex flex-col items-center justify-center">
                        <b>DELIVERED</b>
                        <input type="number" min={0} max={Math.round(p.maxQty)} value={p.deliveredQuantity ?? ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, deliveredQuantity: Math.min(Math.max(0, Math.round(Number(e.target.value) || 0)), prod.quantity) } : prod )) } className="bg-green-200 font-bold outline-none text-center p-2 shadow-xl rounded-xl" />
                        </div>
                        {p.pickedQuantity > p.deliveredQuantity && (
                          <div className="flex flex-col items-center justify-center">
                          <b>DEVIATION REASON</b>
                          <div className={`h-10 shadow-xl rounded-xl w-35 ${!p.deviationReason ? "bg-red-50 border-red-500 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                          <select value={p.deviationReason || ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, deviationReason: e.target.value } : prod )) } className={"w-full h-full font-bold outline-none cursor-pointer"} >
                            <option value="" disabled>Reason</option>
                            <option value="returned">Returned</option>
                            <option value="damaged">Damaged</option>
                            <option value="missing">Missing</option>
                          </select>
                          </div>
                          </div>
                        )}
                      </>
                      )}

                      {userRole === "admin" && (
                        <div className="flex flex-col items-center justify-center">
                        <b>PRICE</b>
                        <input type="number" inputMode="decimal" min={0} value={p.unitPrice} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, unitPrice: Number(e.target.value) } : prod )) } className="w-24 text-center font-bold outline-none bg-yellow-100 p-2 shadow-xl rounded-xl" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}