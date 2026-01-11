// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";
import { useMemo, useState } from "react";

export default function StepAddProducts({
  products,
  setProducts,
  selectedClient,
}: {
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  selectedClient: any;
}) {
  const [productSearch, setProductSearch] = useState("");
  const {
    items: productsCatalog,
    loading: loading,
  } = useList('/api/products', {
    search: productSearch || undefined,
  });
  const availableProducts = useMemo(() => {
    return (productsCatalog || []).filter(
      (p: any) => !products.some((sp) => sp.productId === p._id)
    );
  }, [productsCatalog, products]);

  const addProduct = (product: any) => {
    setProducts((prev) => [
      ...prev,
      {
        productId: product._id,
        brandId: product.brand?._id,
        name: product.name,
        basePrice: product.unitPrice,
        quantity: 0,
        returnReason: "",
      },
    ]);
  };

  const updateQty = (productId: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.max(0, qty) }
          : p
      )
    );
  };

  const removeProduct=(productId: string) => {
    setProducts((prev) => prev.filter((p) => p.productId !== productId));
  };
  
  return (
    <>
    <div className="space-y-6 flex w-full flex-col">
      <h2 className="text-xl font-semibold text-center">Add Products to Credit Memo</h2>

      {/* Product select + add button */}
      
        <input 
          type="text"
          placeholder="Search Products..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
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

            {availableProducts.map((product: any) => (
              <button
                key={product._id}
                type="button"
                onClick={() => addProduct(product)}
                className="w-full text-left p-3 hover:bg-gray-100 transition"
              >
                <div className="font-medium">
                  {product.name}
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
    {products.map((p) => (
      <div 
        key={p.productId} 
        className="flex bg-white rounded-xl py-3 px-2 gap-3 mt-5"
      >
        <span className="flex-1 py-2">{p.name}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={p.quantity}
          onChange={(e) => updateQty(p.productId, Number(e.target.value))}
          className="bg-gray-200  w-20 text-center px-4 py-2 shadow-xl rounded-xl"
        />
        <button
          onClick={() => removeProduct(p.productId)}
          className="bg-red-500 text-white px-2 py-2 rounded-xl shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    ))}
  </>
  );
}
