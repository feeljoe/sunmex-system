"use client";

import { useMemo, useRef, useState, useEffect } from "react";

export default function StepProductsDirect({
  userRole,
  products,
  setProducts,
  routeInventory,
}: {
  userRole: string;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  routeInventory: any[];
}) {
  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<HTMLInputElement[]>([]);

  const [searchMode, setSearchMode] = useState<"product" | "brand">("product");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inventorySearch, setInventorySearch] = useState("");

  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({});
  
  const toggleBrand = (brand: string) => {
    setCollapsedBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inventorySearch, searchMode]);

  // 1. Local Search for Products
  const availableProducts = useMemo(() => {
    if (searchMode !== "product" || !routeInventory) return [];
    const query = inventorySearch.toLowerCase();
    
    return routeInventory.filter((inv: any) => {
      // Must have inventory and not already be added
      if (inv.quantity <= 0) return false;
      if (products.some((p) => p.productId === inv.product._id)) return false;

      // Match query
      const nameMatch = inv.product.name?.toLowerCase().includes(query);
      const brandMatch = inv.product.brand?.name?.toLowerCase().includes(query);
      const skuMatch = inv.product.sku?.toLowerCase().includes(query);
      
      return nameMatch || brandMatch || skuMatch;
    });
  }, [routeInventory, products, inventorySearch, searchMode]);

  // 2. Local Search for Brands
  const availableBrands = useMemo(() => {
    if (searchMode !== "brand" || !routeInventory) return [];
    const query = inventorySearch.toLowerCase();
    
    const brandsMap = new Map();
    routeInventory.forEach((inv: any) => {
      const bName = inv.product.brand?.name;
      if (bName && bName.toLowerCase().includes(query)) {
        brandsMap.set(bName, bName);
      }
    });
    
    return Array.from(brandsMap.values());
  }, [routeInventory, inventorySearch, searchMode]);

  // 3. Add Single Product
  const addProduct = (inv: any) => {
    setProducts((prev) => [
      {
        productId: inv.product._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: inv.product.unitPrice, 
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        maxQty: inv.quantity,
      },
      ...prev,
    ]);
    setInventorySearch("");
  };

  // 4. Add All Products from a Brand
  const addBrandProducts = (brandName: string) => {
    const itemsToAdd = routeInventory.filter(
      (inv: any) =>
        inv.product.brand?.name === brandName &&
        inv.quantity > 0 &&
        !products.some((p) => p.productId === inv.product._id)
    );

    setProducts((prev) => {
      const newProducts = itemsToAdd.map((inv: any) => ({
        productId: inv.product._id,
        brand: inv.product.brand?.name,
        name: inv.product.name,
        unitPrice: inv.product.unitPrice,
        weight: inv.product.weight,
        unit: inv.product.unit,
        caseSize: inv.product.caseSize,
        sku: inv.product.sku,
        quantity: 0,
        maxQty: inv.quantity,
      }));
      return [...newProducts, ...prev];
    });
    setInventorySearch("");
  };

  // 5. Handlers for Qty and Custom Price
  const updateQty = (productId: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.min(Math.max(0, qty), p.maxQty) }
          : p
      )
    );
  };

  const handlePriceChange = (productId: string, newPrice: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.productId === productId) {
          return { ...p, customPrice: newPrice }; 
        }
        return p;
      })
    );
  };

  // 6. Group Added Products
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
    <div className="flex flex-col h-full space-y-4">
      <div className="space-y-4 flex w-full flex-col">
        <h2 className="text-xl font-semibold text-center">Add Products</h2>

        {/* Toggle Mode */}
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => { setSearchMode("product"); setInventorySearch(""); }}
            className={`px-4 py-1 rounded-xl shadow-xl ${
              searchMode === "product" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => { setSearchMode("brand"); setInventorySearch(""); }}
            className={`px-4 py-1 rounded-xl shadow-xl ${
              searchMode === "brand" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
            }`}
          >
            Brand
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            ref={inventoryInputRef}
            type="text"
            placeholder={searchMode === "product" ? "Search Route Inventory..." : "Search Brands..."}
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            onKeyDown={(e) => {
              if (!inventorySearch || availableProducts.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((i) => Math.min(i + 1, availableProducts.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && searchMode === "product") {
                e.preventDefault();
                const inv = availableProducts[highlightedIndex];
                if (!inv) return;
                addProduct(inv);
              }
            }}
            className="w-full h-10 px-3 rounded-xl bg-white shadow-xl"
          />

          {/* Search Dropdown */}
          {inventorySearch.trim() && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y">
              {searchMode === "product" &&
                availableProducts.map((inv, index) => (
                  <button
                    key={inv.product._id}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => addProduct(inv)}
                    className={`w-full text-left p-3 capitalize transition-all duration:500 ${
                      index === highlightedIndex ? "bg-gray-200" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-medium capitalize">
                      {inv.product.brand?.name} {inv.product.name} ({inv.product.weight}{inv.product.unit?.toUpperCase()})
                    </div>
                    <div className="text-sm text-gray-500">
                      SKU: {inv.product.sku} | Route Avail: {Math.round(inv.quantity)}
                    </div>
                  </button>
                ))}

              {searchMode === "brand" &&
                availableBrands.map((brandName) => (
                  <button
                    key={brandName as string}
                    type="button"
                    onClick={() => addBrandProducts(brandName as string)}
                    className="w-full text-left p-3 hover:bg-gray-100 capitalize"
                  >
                    {brandName as string}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Products List */}
      <div className="flex flex-col flex-1 mt-2 overflow-hidden">
        <div className="flex-1 overflow-auto pr-2 pb-4">
          {Object.entries(groupedProducts).map(([brand, brandProducts]) => {
            const isCollapsed = collapsedBrands[brand];

            return (
              <div key={brand} className="mt-2">
                {/* BRAND HEADER */}
                <div
                  onClick={() => toggleBrand(brand)}
                  className="bg-gray-300 px-4 py-2 rounded-xl font-bold capitalize flex justify-between items-center cursor-pointer"
                >
                  <span>{brand} ({brandProducts.length})</span>
                  <span className="text-lg">{isCollapsed ? "▸" : "▾"}</span>
                </div>

                {/* PRODUCTS */}
                {!isCollapsed && (
                  <div className="bg-white shadow-xl rounded-xl mb-4 overflow-hidden border">
                    {brandProducts.map((p: any) => (
                      <div key={p.productId} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border-b last:border-b-0 gap-3">
                        <div className="flex flex-col text-left">
                          <span className="capitalize font-medium text-sm">
                            {p.brand?.toLowerCase()} {p.name?.toLowerCase()} {p.weight}{p.unit?.toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-xs">
                            SKU: {p.sku} | Route Avail: {Math.round(p.maxQty)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-500 mb-1">QTY</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={Math.round(p.maxQty)}
                              value={p.quantity || ""}
                              onChange={(e) => updateQty(p.productId, Math.round(Number(e.target.value) || 0))}
                              className="bg-gray-200 w-16 text-center px-2 py-2 shadow-sm rounded-xl"
                            />
                          </div>

                          {/* Admin Only: Price Override */}
                          {userRole === "admin" && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-gray-500 mb-1">PRICE</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={p.finalPrice?.toFixed(2)} // Derived from DirectSaleWizard PricingLists
                                value={p.customPrice !== undefined ? p.customPrice : (p.finalPrice ?? p.unitPrice ?? "")}
                                onChange={(e) => handlePriceChange(p.productId, e.target.value)}
                                className="w-20 text-center bg-yellow-100 px-2 py-2 shadow-sm rounded-xl"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}