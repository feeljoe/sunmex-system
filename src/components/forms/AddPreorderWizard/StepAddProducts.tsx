// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";
import { useMemo, useRef, useState, useEffect } from "react";

export default function StepAddProducts({
  userRole,
  products,
  setProducts,
  preorderStatus,
  invalidProducts,
}: {
  userRole: string;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  preorderStatus: string;
  invalidProducts: string[];
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
  
  // Product Mode Fetch
  const {
    items: inventory,
    loading: loadingInventory,
  } = useList(
    searchMode === "product" ? '/api/productInventory' : "", 
    searchMode === "product"
    ? {
        search: inventorySearch || undefined,
        limit: 50,
      }: {}
    );

  const availableProducts = useMemo(() => {
    return (inventory || []).filter(
      (inv: any) =>
        inv.currentInventory > 0 &&
      !products.some((p) => p.inventoryId === inv._id)
    );
  }, [inventory, products]);

  // Brand Mode Fetch
  const {
    items: brands,
    loading: loadingBrands,
  } = useList(
    searchMode === "brand" ? '/api/brands' : "", 
    searchMode === "brand"
    ? {
        search: inventorySearch || undefined,
        limit: 1000,
      }: {}
    );

 // Add single product
  const addProduct = (inv: any) => {
    setProducts((prev) => [
      {
        inventoryId: inv._id,
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: inv.product.unitPrice,
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        pickedQuantity: 0,
        deliveredQuantity: 0,
        maxQty: inv.currentInventory,
      },
      ...prev,
    ]);

    setInventorySearch("");
  };

  //Add all products from Brand
  const addBrandProducts = async (brand: any) => {
    const res = await fetch(
      `/api/productInventory?brand=${brand._id}&availableOnly=true&limit=200`
    );
    const data = await res.json();
    console.log("BRAND API RESPONSE:", data);

    if (!data.items) return;

    const sorted = [...data.items].sort((a, b) =>
      a.product.name.localeCompare(b.product.name)
    );

    setProducts((prev) => {
      const filtered = sorted
      .filter(inv => !prev.some(p => p.inventoryId === inv._id))
      .map(inv => ({
        inventoryId: inv._id,
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: inv.product.unitPrice,
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        pickedQuantity: 0,
        deliveredQuantity: 0,
        maxQty: inv.currentInventory,
      }));
      return [...filtered, ...prev];
    });
    setInventorySearch("");
  };

  //Update Quantity
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

  //Group products by brand
  const groupedProducts = useMemo(() => {
  const grouped: Record<string, any[]> = {};

  products.forEach((p) => {
    const brandName = p.brand || "No Brand";

    if (!grouped[brandName]) grouped[brandName] = [];
    grouped[brandName].push(p);
  });

  // sort products inside each brand
  Object.keys(grouped).forEach((brand) => {
    grouped[brand].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  return grouped;
}, [products]);
  
  return (
    <>
    <div className="space-y-6 flex w-full flex-col">
      <h2 className="text-xl font-semibold text-center">Add Products</h2>

      {/* Toggle mode */}
      <div className="flex gap-2 justify-center">
        <button
        type="button"
        onClick={() => {
          setSearchMode("product");
          setInventorySearch("");
        }}
        className={`px-4 py-1 rounded-xl shadow-xl ${
          searchMode === "product"
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-black"
        }`}>
          Products
        </button>
        <button
        type="button"
        onClick={() => {
          setSearchMode("brand");
          setInventorySearch("");
        }}
        className={`px-4 py-1 rounded-xl shadow-xl ${
          searchMode === "brand"
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-black"
        }`}>
          Brand
        </button>
      </div>
      
      {/* Product select + add button */}
        <input 
          ref= {inventoryInputRef}
          type="text"
          placeholder={
            searchMode === "product"
            ? "Search Products..."
            : "Search Brands ..."
          }
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          onKeyDown={(e) => {
            if(!inventorySearch || availableProducts.length === 0) return;

            if(e.key === "ArrowDown"){
              e.preventDefault();
              setHighlightedIndex(i =>
                Math.min(i + 1, availableProducts.length -1)
              );
            }
            if(e.key === "ArrowUp"){
              e.preventDefault();
              setHighlightedIndex(i =>
                Math.max(i - 1, 0)
              );
            }
            if(e.key === "Enter"){
              e.preventDefault();
              const inv = availableProducts[highlightedIndex];
              if(!inv) return;
              addProduct(inv);

              setTimeout(() => {
                qtyInputRefs.current[0]?.focus();
              }, 0);
            }
          }}
          className="h-10 px-3 rounded-xl bg-white shadow-xl" 
        />
        {/* 📋 Search results list (only when typing) */}
        {inventorySearch.trim() && (
          <div className="bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y">
            
            {/* Product Mode */}
            {searchMode === "product" &&
              availableProducts.map((inv, index) => (
                <button
                key={inv._id}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => addProduct(inv)}
                className={`w-full text-left p-3 capitalize
                  ${index === highlightedIndex? "bg-gray-200": "hover:bg-gray-100"}
                  transition-all duration:500`
                }>
                  <div className="font-medium capitalize">
                    {inv.product.brand?.name}{" "}
                    {inv.product.name}{" "} ({inv.product.weight}{inv.product.unit?.toUpperCase()})
                  </div>
                  <div className="text-sm text-gray-500">
                    SKU: {inv.product.sku} | Available:{" "}
                    {Math.round(inv.currentInventory)}
                  </div>
                </button>
            ))}

            {/* Brand Mode */}
            {searchMode === "brand" &&
              brands.map((brand: any) => (
                <button
                  key={brand._id}
                  type="button"
                  onClick={() =>
                    addBrandProducts(brand)
                  }
                  className="w-full text-left p-3 hover:bg-gray-100 capitalize"
                >
                  {brand.name}
                </button>
              ))}
          </div>
        )}
    </div>
    {/* Selected products list (GROUPED) */}
    <div className="flex flex-col h-4/5 mt-2">
      <div className="flex-1 overflow-auto">
      {Object.entries(groupedProducts).map(([brand, brandProducts]) => {
  const isCollapsed = collapsedBrands[brand];

  return (
    <div key={brand} className="mt-2">

      {/* BRAND HEADER */}
      <div
        onClick={() => toggleBrand(brand)}
        className="bg-gray-300 px-4 py-2 rounded-xl font-bold capitalize flex justify-between items-center cursor-pointer"
      >
        <span>
          {brand} ({brandProducts.length})
        </span>

        <span className="text-lg">
          {isCollapsed ? "▸" : "▾"}
        </span>
      </div>

      {/* PRODUCTS */}
      {!isCollapsed &&
      <div className="bg-white shadow-xl rounded-xl mb-6">
        {brandProducts.map((p: any, i: number) => (
          <div
            key={p.inventoryId}
            className={`flex justify-between rounded-xl px-2 gap-3 mt-3 border-2 transition-all
              ${
                invalidProducts?.includes(p.inventoryId)
                  ? "border-red-500 bg-red-100"
                  : "bg-white border-transparent"
              }
            `}
          >
            <div className="flex flex-col text-left">
              <span className="mt-2 capitalize">
                {p.name?.toLowerCase()} {p.weight}
                {p.unit?.toUpperCase()} ({p.caseSize} Units per case)
              </span>
              <span className="text-gray-400 text-xs">
                SKU: {p.sku} | Available: {Math.round(p.maxQty)}
              </span>
            </div>
            <div className="flex flex-col">
              {userRole === "admin" &&(
              <div className="flex justify-between items-center gap-4 p-2">
                  <b>QTY</b>
                  {showPicked && (<b>PICKED</b>)}
                  {showDelivered && (<b>DELIVERED</b>)}
                  <b>PRICE</b>
              </div>
              )}
            <div className="flex justify-between items-center gap-4">
              
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={Math.round(p.maxQty)}
                value={p.quantity}
                onChange={(e) =>
                  updateQty(p.inventoryId, Number(e.target.value))
                }
                className="bg-gray-200 w-20 text-center px-4 py-2 shadow-xl rounded-xl"
              />
              {userRole === "admin" && showPicked &&(
                
                <input
                  type="number"
                  min={0}
                  max={Math.round(p.maxQty)}
                  value={p.pickedQuantity ?? 0}
                  onChange={(e) =>
                    setProducts(prev =>
                      prev.map(prod =>
                        prod.inventoryId === p.inventoryId
                          ? {
                              ...prod,
                              pickedQuantity: Math.min(
                                Math.max(0, Number(e.target.value)),
                                prod.quantity
                              ),
                            }
                          : prod
                      )
                    )
                  }
                  className="bg-green-200 w-20 text-center px-4 py-2 shadow-xl rounded-xl"
                />
              )}
              {userRole === "admin" && showDelivered &&(
                
                <input
                  type="number"
                  min={0}
                  max={Math.round(p.maxQty)}
                  value={p.deliveredQuantity ?? 0}
                  onChange={(e) =>
                    setProducts(prev =>
                      prev.map(prod =>
                        prod.inventoryId === p.inventoryId
                          ? {
                              ...prod,
                              deliveredQuantity: Math.min(
                                Math.max(0, Number(e.target.value)),
                                prod.quantity
                              ),
                            }
                          : prod
                      )
                    )
                  }
                  className="bg-green-200 w-20 text-center px-4 py-2 shadow-xl rounded-xl"
                />
              )}
              {userRole === "admin" && (
                <input
                  type="number"
                  inputMode="decimal"
                  value={p.unitPrice}
                  onChange={(e) =>
                    setProducts(prev =>
                      prev.map(prod =>
                        prod.inventoryId === p.inventoryId
                          ? { ...prod, unitPrice: Number(e.target.value) }
                          : prod
                      )
                    )
                  }
                  className="w-24 text-center bg-yellow-100 px-4 py-2 shadow-xl rounded-xl"
                />
              )}
            </div>
            </div>
          </div>
        ))}</div>}
    </div>
  );
})}
    </div>
    </div>
  </>
  );
}