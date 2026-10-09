// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";
import { useMemo, useRef, useState, useEffect } from "react";
import { applyPricingLists } from "@/utils/applyPricingLists";

export default function StepAddProducts({
  userRole,
  products,
  setProducts,
  pricingLists,
  selectedClient,
  mode = "create",
}: {
  userRole: string;
  products: any[];
  pricingLists: any[];
  selectedClient: any;
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  mode?: "create" | "edit";
}) {
  const isAdminEditing = userRole === "admin" && mode === "edit";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<HTMLInputElement[]>([]);

  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  useEffect(() => {
    setHighlightedIndex(0);
  }, [setProductSearch]);
  const {
    items: productsCatalog,
    loading: loading,
  } = useList('/api/products', {
    search: productSearch || undefined,
  });

  const availableProducts = useMemo(() => {
    return (productsCatalog || []);
  }, [productsCatalog]);

  const addProduct = (product: any) => {
    const rawProduct = {
      productId: product._id,
      brandId: product.brand?._id,
      unitPrice: product.unitPrice,
    };

    // B. Calculate the exact discounted price for this client
    const applied = applyPricingLists([rawProduct], selectedClient, pricingLists)[0];
    const finalPrice = applied.effectiveUnitPrice ?? product.unitPrice ?? 0;

    setProducts((prev) => [
      {
        lineId: Math.random().toString(36).substring(2, 9),
        productId: product._id,
        brandId: product.brand?._id,
        brand: product.brand?.name,
        name: product.name,
        sku: product.sku,
        weight: product.weight,
        unitPrice: finalPrice,
        unit: product.unit,
        caseSize: product.caseSize,
        basePrice: product.unitPrice,
        quantity: 0,
        pickedQuantity: 0,
        returnedQuantity: 0,
        returnReason: "",
      },
      ...prev,
    ]);
  };

  const updateQty = (lineId: string, qty: number) => {
    const quantity = Math.max(0, Math.round(qty));

    setProducts((prev) =>
      prev.map((p) => {
        if (p.lineId !== lineId) return p;
        return {
          ...p,
          quantity,
          ...(isAdminEditing && {
            pickedQuantity: Math.min(p.pickedQuantity ?? 0, quantity),
            returnedQuantity: Math.min(p.returnedQuantity ?? 0, p.pickedQuantity ?? 0, quantity),
          }),
        };
      })
    );
  };

  const updatePickedQty = (lineId: string, qty: number) => {
    if(!isAdminEditing) return;
    setProducts(prev => prev.map(p => {
      if(p.lineId !== lineId) return p;
      const pickedQuantity = Math.min(Math.max(0, Math.round(qty)), p.quantity);
      return {
        ...p,
        pickedQuantity,
        returnedQuantity: Math.min(p.returnedQuantity ?? 0, pickedQuantity),
      };
    })
  );
  };

  const updateReturnedQty = (lineId: string, qty: number) => {
    if (!isAdminEditing) return;
    setProducts(prev => prev.map(p => p.lineId === lineId ? {
      ...p,
      returnedQuantity: Math.min(Math.max(0, Math.round(qty)), p.pickedQuantity ?? 0),
    } : p
    ));
  };

  const removeProduct = (lineId: string) => {
    setProducts((prev) => prev.filter((p) => p.lineId !== lineId));
  };

  return (
    <>
      <div className="space-y-2 flex w-full flex-col">
        <h2 className="text-xl font-semibold text-center">Add Products to Credit Memo</h2>

        {/* Product select + add button */}

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search Products..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          onKeyDown={(e) => {
            if (!productSearch || availableProducts.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex(i =>
                Math.min(i + 1, availableProducts.length - 1)
              );
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex(i =>
                Math.max(i - 1, 0)
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const product = availableProducts[highlightedIndex];
              if (!product) return;
              addProduct(product);
              setProductSearch("");

              setTimeout(() => {
                qtyInputRefs.current[0]?.focus();
              }, 0);
            }
          }}
          className="h-10 px-3 rounded-xl bg-white shadow-xl"
        />
        {/* 📋 Search results list (only when typing) */}
        {productSearch.trim() && (
          <div className="bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y">
            {loading && (
              <p className="p-3 text-sm text-gray-500">
                Loading products...
              </p>
            )}

            {!loading && availableProducts.length === 0 && (
              <p className="p-3 text-sm text-gray-500">
                No products found
              </p>
            )}

            {availableProducts.map((product: any, index) => (
              <button
                key={product._id}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => {
                  addProduct(product);
                  setProductSearch("");
                  setTimeout(() => {
                    qtyInputRefs.current[0]?.focus();
                  }, 0);
                }}
                className={`w-full text-left p-3 
                  ${index === highlightedIndex ? "bg-gray-200" : "hover:bg-gray-100"} transition`
                }
              >
                <div className="font-medium capitalize">
                  {product.brand?.name.toLowerCase()} {product.name?.toLowerCase()} {product.weight && product.unit && (<span>{product.weight}{product.unit?.toUpperCase()}</span>)} {product.caseSize && (<span>({product.caseSize} units per case)</span>)}
                </div>
                <div className="text-xs text-gray-500">
                  SKU: {product.sku} UPC: {product.upc}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Selected products list */}
      {products.map((p, i) => (
        <div
          key={p.lineId}
          className="flex bg-white rounded-xl p-2 gap-2 mt-2 justify-between"
        >
          <div className={`${userRole === "admin" ? "text-md" : "text-sm"}`}>
            <span className="py-2 capitalize">{p.brand && (<span className="font-bold">{p.brand} </span>)}{p.name?.toLowerCase()} {p.weight && p.unit && (<span>{p.weight}{p.unit?.toUpperCase()}</span>)} {p.caseSize && (<span>({p.caseSize} units per case)</span>)} <span className="text-gray-400 text-xs">({p.sku})</span></span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs font-bold">QTY</label>
              <input
              ref={el => {
                if (el) qtyInputRefs.current[i] = el;
              }}
              type="number"
              inputMode="numeric"
              min={0}
              value={p.quantity}
              onChange={(e) => updateQty(p.lineId, Math.round(Number(e.target.value) || 0))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchInputRef.current?.focus();
                }
              }}
              className="bg-gray-200  w-20 text-center px-4 py-2 shadow-xl rounded-xl"
            />
            </div>
            {isAdminEditing && (
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs font-bold">PICKED</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={p.quantity}
                  value={p.pickedQuantity ?? 0}
                  onChange={e => updatePickedQty(p.lineId, Number(e.target.value) || 0)}
                  className="bg-green-200 w-20 text-center p-2 font-bold shadow-xl rounded-xl"
                />
              </div>
            )}
            {isAdminEditing && (
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs font-bold">RETURNED</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={p.pickedQuantity ?? 0}
                  value={p.returnedQuantity ?? 0}
                  onChange={e => updateReturnedQty(p.lineId, Number(e.target.value) || 0)}
                  className="bg-blue-200 w-20 text-center p-2 font-bold shadow-xl rounded-xl" 
                />
              </div>
            )}
            {userRole === "admin" && (
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs font-bold">PRICE</label>
                <input
                type="number"
                inputMode="decimal"
                value={p.unitPrice}
                onChange={(e) =>
                  setProducts(prev =>
                    prev.map(prod =>
                      prod.lineId === p.lineId
                        ? { ...prod, unitPrice: Number(e.target.value) }
                        : prod
                    )
                  )
                }
                className="w-24 text-center bg-yellow-100 p-2 font-bold shadow-xl rounded-xl"
              />
              </div>
            )}
            <button
              onClick={() => removeProduct(p.lineId)}
              className="bg-red-500 text-white px-2 py-2 rounded-xl shadow-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
