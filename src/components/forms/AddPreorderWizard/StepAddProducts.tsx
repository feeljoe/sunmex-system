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
  const [inventorySearch, setInventorySearch] = useState("");
  const {
    items: inventory,
    loading: loadingInventory,
  } = useList('/api/productInventory', {
    search: inventorySearch || undefined,
    limit: 50,
  });
  const availableProducts = useMemo(() => {
    return (inventory || []).filter(
      (inv: any) =>
        inv.currentInventory > 0 &&
      !products.some((p) => p.inventoryId === inv._id)
    );
  }, [inventory, products]);

  const addProduct = (inv: any) => {
    setProducts((prev) => [
      {
        inventoryId: inv._id,
        productId: inv.product._id,
        brandId: inv.product.brand?._id,
        name: inv.product.name,
        unitPrice: inv.product.unitPrice,
        quantity: 0,
        maxQty: inv.currentInventory,
      },
      ...prev,
    ]);

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
  
  return (
    <>
    <div className="space-y-6 flex w-full flex-col">
      <h2 className="text-xl font-semibold text-center">Add Products</h2>

      {/* Product select + add button */}
      
        <input 
          type="text"
          placeholder="Search Products..."
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          className="h-10 px-3 rounded-xl bg-white shadow-xl" 
        />
        {/* 📋 Search results list (only when typing) */}
        {inventorySearch.trim() && (
          <div className="bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y">
            {loadingInventory && (
              <p className="p-3 text-sm text-gray-500">
                Loading products...
              </p>
            )}

            {!loadingInventory && availableProducts.length === 0 && (
              <p className="p-3 text-sm text-gray-500">
                No products found
              </p>
            )}

            {availableProducts.map((inv) => (
              <button
                key={inv._id}
                type="button"
                onClick={() => addProduct(inv)}
                className="w-full text-left p-3 hover:bg-gray-100 transition-all duration:500 capitalize"
              >
                <div className="font-medium">
                  {inv.product.name.toLowerCase()}
                </div>
                <div className="text-sm text-gray-500">
                  Available: {Number(inv.currentInventory).toFixed()}
                </div>
              </button>
            ))}
          </div>
        )}
    </div>
    {/* Selected products list */}
    {products.map((p) => (
      <div key={p.inventoryId} className="flex bg-white rounded-xl py-3 px-2 gap-3 mt-5">
        <span className="flex-1 py-2 capitalize">{p.name.toLowerCase()}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={p.maxQty}
          value={p.quantity}
          onChange={(e) => updateQty(p.inventoryId, Number(e.target.value))}
          className="bg-gray-200  w-20 text-center px-4 py-2 shadow-xl rounded-xl"
        />
        <button
          onClick={() => removeProduct(p.inventoryId)}
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
