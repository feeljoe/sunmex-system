// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";
import { useMemo, useRef, useState, useEffect } from "react";

export default function StepAddProducts({
  userRole,
  products,
  setProducts,
}: {
  userRole: string;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<HTMLInputElement[]>([]);

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
                    {inv.currentInventory}
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
            className="flex justify-between bg-white rounded-xl px-2 gap-3 mt-3"
          >
            <div className="flex flex-col text-left">
              <span className="mt-2 capitalize">
                {p.name?.toLowerCase()} {p.weight}
                {p.unit?.toUpperCase()} ({p.caseSize} Units per case)
              </span>
              <span className="text-gray-400 text-xs">
                SKU: {p.sku} | Available: {p.maxQty?.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={p.maxQty}
                value={p.quantity}
                onChange={(e) =>
                  updateQty(p.inventoryId, Number(e.target.value))
                }
                className="bg-gray-200 w-20 text-center px-4 py-2 shadow-xl rounded-xl"
              />

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

            <button
              onClick={() => removeProduct(p.inventoryId)}
              className="bg-red-500 text-white px-2 py-2 rounded-xl shadow-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
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