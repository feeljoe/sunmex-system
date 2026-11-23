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
  const resultsRef = useRef<HTMLDivElement>(null);

  const showPicked = preorderStatus === "ready" || preorderStatus === "delivered";
  const showDelivered = preorderStatus === "delivered";

  const [inventorySearch, setInventorySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [addingBrandId, setAddingBrandId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({});
  const toggleBrand = (brand: string) => {
    setCollapsedBrands(prev => ({
      ...prev,
      [brand]: !prev[brand]
    }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(inventorySearch.trim());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [inventorySearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>(`[data-sugestion-index="${highlightedIndex}"]`);
    selected?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [highlightedIndex, searchOpen]);


  const searchActive = debouncedSearch.length > 0;

  // Search available inventory products.
  const { items: inventory, loading: loadingInventory } = useList(
    searchActive ? "/api/productInventory" : "",
    searchActive
      ? {
        search: debouncedSearch,
        availableOnly: true,
        limit: 50,
        ...(preorderId ? { preorderId } : {}),
      }
      : {}
  );

  // Search brands at the same time.
  const {
    items: brands,
    loading: loadingBrands,
  } = useList(
    searchActive ? "/api/brands" : "",
    searchActive
      ? {
        search: debouncedSearch,
        limit: 100,
      }
      : {}
  );

  const availableProducts = useMemo(() => {
    const selectedIds = new Set(
      products.map((p) => String(p.inventoryId))
    );

    return (inventory ?? []).filter(
      (inv: any) =>
        Number(inv.currentInventory) > 0 &&
        !selectedIds.has(String(inv._id))
    );
  }, [inventory, products]);

  const matchingBrands = useMemo(() => {
    return [...(brands ?? [])].sort(
      (a: any, b: any) =>
        String(a.name ?? "").localeCompare(
          String(b.name ?? ""),
          undefined,
          { sensitivity: "base" }
        )
    );
  }, [brands]);

  const searching = searchActive && (loadingInventory || loadingBrands);

  type SearchSuggestion =
    | { kind: "brand"; data: any }
    | { kind: "product"; data: any };

  const suggestions = useMemo<SearchSuggestion[]>(() => [
    ...matchingBrands.map((brand: any) => ({
      kind: "brand" as const,
      data: brand,
    })),
    ...availableProducts.map((inv: any) => ({
      kind: "product" as const,
      data: inv,
    })),
  ], [matchingBrands, availableProducts]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedSearch]);

  const addProduct = (inv: any) => {
    const rawProduct = {
      productId: inv.product._id,
      brandId: inv.product.brand?._id,
      unitPrice: inv.product.unitPrice,
      image: inv.product.image ?? null,
      categoryId: inv.product.productType?._id ?? null,
      categoryName: inv.product.productType?.name ?? "Uncategorized",
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
        image: inv.product.image ?? null,
        categoryId: inv.product.productType?._id ?? null,
        categoryName: inv.product.productType?.name ?? "Uncategorized",
      },
      ...prev,
    ]);

    setInventorySearch("");
  };

  const addBrandProducts = async (brand: any) => {

    if (addingBrandId) return;
    setAddingBrandId(String(brand._id));
    setSearchError("");

    try {
      const PAGE_LIMIT = 200;
      const allInventory: any[] = [];
      let currentPage = 1;
      let total = 0;
      do {
        const params = new URLSearchParams({
          brand: String(brand._id),
          availableOnly: "true",
          page: String(currentPage),
          limit: String(PAGE_LIMIT),
        });
        if (preorderId) {
          params.set("preorderId", preorderId);
        }
        const response = await fetch(`/api/productInventory?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to retrieve brand inventory");
        }
        const data = await response.json();
        const rows = Array.isArray(data.items) ? data.items : [];
        allInventory.push(...rows);
        total = Number(data.total ?? 0);
        if (rows.length === 0) break;
        currentPage += 1;
      } while (allInventory.length < total);
      const sorted = allInventory.sort((a, b) => String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""), undefined, { sensitivity: "base" }));
      setProducts((previous) => {
        const existingIds = new Set(previous.map((p) => String(p.inventoryId)));
        const newInventory = sorted.filter((inv) => !existingIds.has(String(inv._id)) && Number(inv.currentInventory) > 0);
        const rawBatch = newInventory.map((inv) => ({
          productId: inv.product._id,
          brandId: inv.product.brand?._id,
          unitPrice: Number(inv.product.unitPrice ?? 0),
        }));
        const pricedBatch = applyPricingLists(rawBatch, selectedClient, pricingLists);
        const newProducts = newInventory.map((inv, index) => ({
          inventoryId: inv._id,
          productId: inv.product._id,
          brandId: inv.product.brand?._id,
          brand: inv.product.brand?.name,
          name: inv.product.name,
          unitPrice: Number(pricedBatch[index]?.effectiveUnitPrice ?? inv.product.unitPrice ?? 0),
          weight: inv.product.weight,
          unit: inv.product.unit,
          caseSize: inv.product.caseSize,
          sku: inv.product.sku,
          quantity: 0,
          pickedQuantity: 0,
          deliveredQuantity: 0,
          deviationReason: "",
          maxQty: Math.floor(Number(inv.currentInventory)),
          image: inv.product.image ?? null,
          categoryId: inv.product.productType?._id ?? null,
          categoryName: inv.product.productType?.name ?? "Uncategorized",
        }));
        return [...newProducts, ...previous];
      });
      setInventorySearch("");
      setDebouncedSearch("");
      setSearchOpen(false);
    } catch (err: any) {
      setSearchError(err.message ?? "Failed to add brand products.");
    } finally {
      setAddingBrandId(null);
    }
  };

  const selectSuggestion = async (suggestion: SearchSuggestion) => {
    if (suggestion.kind === "brand") {
      await addBrandProducts(suggestion.data);
    } else {
      addProduct(suggestion.data);
      setSearchOpen(false);
    }
    setHighlightedIndex(0);
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">

      {/* HEADER SECTION (Shrinks to exact size needed) */}
      <div className="flex w-full shrink-0 flex-col">

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

        {/* UNIFIED PRODUCT / BRAND SEARCH */}
        <div className="relative w-full">
          <div className="relative px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.34-4.34m1.59-5.41a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              ref={inventoryInputRef}
              type="search"
              value={inventorySearch}
              placeholder="Search product, brand, SKU, UPC..."
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setInventorySearch(event.target.value);
                setSearchOpen(true);
                setSearchError("");
              }}
              onKeyDown={(event) => {
                if (!searchOpen || !inventorySearch.trim() || addingBrandId) {
                  return;
                }
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedIndex((previous) => Math.min(previous + 1, suggestions.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedIndex((previous) =>
                    Math.max(0, previous - 1)
                  );
                }

                if (event.key === "Enter") {
                  event.preventDefault();

                  const suggestion =
                    suggestions[highlightedIndex];

                  if (suggestion) {
                    void selectSuggestion(suggestion);
                  }
                }
              }}
              autoComplete="off"
              aria-label="Search products and brands"
              aria-expanded={searchOpen && !!inventorySearch.trim()}
              className="min-h-11 w-full rounded-xl bg-white py-2 pl-10 pr-10 font-semibold outline-note focus:border-blue-500"
            />
            {inventorySearch && (
              <button
                type="button"
                onClick={() => {
                  setInventorySearch("");
                  setSearchOpen(false);
                  setHighlightedIndex(0);
                  inventoryInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchError && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700"
            >
              {searchError}
            </p>
          )}
          {searchOpen && inventorySearch.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 flex max-h-[50dvh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div ref={resultsRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                {(searching || debouncedSearch !== inventorySearch.trim()) && (
                  <div className="flex items-center gap-2 border-b p-2 text-xs font-semibold text-blue-700">
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 0 1 8-8"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Searching inventory...
                  </div>
                )}
                {debouncedSearch === inventorySearch.trim() && (
                  <>
                    {matchingBrands.length > 0 && (
                      <section className="">
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-50 px-3 py-2">
                          <span className="text-[11px] font-black uppercase text-blue-800">
                            Matching Brands
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600">
                            And all available products
                          </span>
                        </div>
                        {matchingBrands.map((brand: any, index: number) => (
                          <button
                            key={brand._id}
                            type="button"
                            data-suggestion-index={index}
                            disabled={addingBrandId !== null}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => void selectSuggestion({ kind: "brand", data: brand })}
                            className={`flex w-full items-center justify-between gap-3 border-b p-2 text-left transition-colors disabled:opacity-50 ${highlightedIndex === index ? "bg-blue-100" : "hover:bg-gray-50"}`}
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold capitalize text-gray-900">
                                {brand.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Add available products from this brand
                              </p>
                            </div>
                            {addingBrandId === String(brand._id) ? (
                              <svg
                                className="size-5 shrink-0 animate-spin text-blue-600"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="opacity-25"
                                />
                                <path
                                  d="M4 12a8 8 0 0 1 8-8"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              <span className="shrink-0 rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                                Add Brand
                              </span>
                            )}
                          </button>
                        ))}
                      </section>
                    )}
                    {availableProducts.length > 0 && (
                      <section>
                        <div className="sticky top-0 z-10 bg-gray-100 px-3 py-2">
                          <span className="text-[11px] font-black uppercase text-gray-700">
                            Matching Products
                          </span>
                        </div>
                        {availableProducts.map((inv: any, index: number) => {
                          const suggestionIndex = matchingBrands.length + index;
                          return (
                            <button
                              key={inv._id}
                              type="button"
                              data-suggestion-index={suggestionIndex}
                              disabled={addingBrandId !== null}
                              onMouseEnter={() => setHighlightedIndex(suggestionIndex)}
                              onClick={() => void selectSuggestion({ kind: "product", data: inv })}
                              className={`flex w-full items-center justify-between gap-3 border-b p-2 text-left transition-colors disabled:opacity-50 ${highlightedIndex === suggestionIndex ? "bg-blue-100" : "hover:bg-gray-50"}`}
                            >
                              <div className="min-w-0">
                                <p className="break-words text-sm font-bold capitalize text-gray-900">
                                  {inv.product?.brand?.name}{" "}{inv.product?.name}{inv.product?.weight ? ` ${inv.product.weight}${inv.product.unit ?? ""}` : ""}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                                + Add
                              </span>
                            </button>
                          );
                        })}
                      </section>
                    )}
                    {!searching && suggestions.length === 0 && (
                      <div className="p-5 text-center text-sm text-gray-500">
                        No matching brands or available products.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIST SECTION (Now perfectly fills the remaining space WITHOUT chopping) */}
      <div className="mt-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y p-1 [-webkit-overflow-scrolling:touch]">
        {Object.entries(groupedProducts)
          .sort(([brandA], [brandB]) => brandA.localeCompare(brandB, undefined, { sensitivity: "base" })).map(([brand, brandProducts]) => {
            const isCollapsed = collapsedBrands[brand];
            return (
              <div key={brand} className="mt-2">
                <div onClick={() => toggleBrand(brand)} className="bg-gray-300 px-4 py-2 rounded-xl font-bold capitalize flex justify-between items-center cursor-pointer hover:bg-gray-400 transition-colors">
                  <span>{brand} ({brandProducts.length})</span>
                  <span className="text-lg">{isCollapsed ? "▸" : "▾"}</span>
                </div>

                {!isCollapsed &&
                  <div className="bg-white shadow-xl rounded-xl mb-4">
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
                        <div className={`grid ${userRole === "admin" ? "grid-cols-2 md:flex" : "flex"} justify-between items-center whitespace-nowrap gap-2`}>
                          <div className="flex flex-col items-center justify-center">
                            <b>QTY</b>
                            <input type="number" inputMode="numeric" min={0} max={Math.floor(Number(p.maxQty ?? 0))} value={p.quantity ?? ""} onFocus={(event) => event.target.select()} onChange={(e) => updateQty(p.inventoryId, Math.round(Number(e.target.value) || 0))} className="w-20 bg-gray-100 text-center font-bold outline-none focus:ring-2 focus:ring-blue-400 p-2 rounded-xl sm:w-24" />
                          </div>
                          {userRole === "admin" && showPicked && (
                            <div className="flex flex-col items-center justify-center">
                              <b>PICKED</b>
                              <input type="number" min={0} max={Math.round(p.maxQty)} value={p.pickedQuantity ?? ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, pickedQuantity: Math.min(Math.max(0, Math.round(Number(e.target.value) || 0)), prod.quantity) } : prod))} className="bg-green-200 font-bold outline-none text-center p-2 shadow-xl rounded-xl" />
                            </div>
                          )}
                          {userRole === "admin" && showDelivered && (
                            <>
                              <div className="flex flex-col items-center justify-center">
                                <b>DELIVERED</b>
                                <input type="number" min={0} max={Math.round(p.maxQty)} value={p.deliveredQuantity ?? ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, deliveredQuantity: Math.min(Math.max(0, Math.round(Number(e.target.value) || 0)), prod.quantity) } : prod))} className="bg-green-200 font-bold outline-none text-center p-2 shadow-xl rounded-xl" />
                              </div>
                              {p.pickedQuantity > p.deliveredQuantity && (
                                <div className="flex flex-col items-center justify-center">
                                  <b>DEVIATION REASON</b>
                                  <div className={`h-10 shadow-xl rounded-xl w-35 ${!p.deviationReason ? "bg-red-50 border-red-500 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                                    <select value={p.deviationReason || ""} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, deviationReason: e.target.value } : prod))} className={"w-full h-full font-bold outline-none cursor-pointer"} >
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
                              <input type="number" inputMode="decimal" min={0} value={p.unitPrice} onChange={(e) => setProducts(prev => prev.map(prod => prod.inventoryId === p.inventoryId ? { ...prod, unitPrice: Number(e.target.value) } : prod))} className="w-24 text-center font-bold outline-none bg-yellow-100 p-2 shadow-xl rounded-xl" />
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