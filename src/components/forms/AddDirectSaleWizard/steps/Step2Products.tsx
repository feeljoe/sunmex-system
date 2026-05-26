"use client";
import { useMemo } from "react";

export default function StepProductsDirect({ products, setProducts, routeInventory }: any) {
  
  // Group the route's inventory by Brand
  const groupedInventory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    routeInventory.forEach((item: any) => {
      const brandName = item.product.brand?.name || "Other";
      if (!grouped[brandName]) grouped[brandName] = [];
      grouped[brandName].push(item);
    });
    return grouped;
  }, [routeInventory]);

  const updateQty = (invId: string, item: any, qty: number) => {
    setProducts((prev: any[]) => {
      const existing = prev.find(p => p.inventoryId === invId);
      const safeQty = Math.min(Math.max(0, qty), item.quantity); // item.quantity is the Route Available qty

      if (existing) {
        return prev.map(p => p.inventoryId === invId ? { ...p, quantity: safeQty } : p);
      }

      return [...prev, {
        inventoryId: invId,
        productId: item.product._id,
        name: item.product.name,
        brand: item.product.brand?.name,
        uom: item.product.unit,
        weight: item.product.weight,
        unitPrice: item.product.unitPrice,
        maxQty: item.quantity,
        quantity: safeQty
      }];
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Route Inventory</h2>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {Object.entries(groupedInventory).map(([brand, items]: any) => (
          <div key={brand} className="space-y-2">
            <div className="bg-gray-200 px-3 py-1 rounded-lg font-bold sticky top-0">{brand}</div>
            {items.map((item: any) => {
              const selected = products.find((p: any) => p.inventoryId === item._id);
              return (
                <div key={item._id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="font-medium capitalize text-sm">{brand?.toLowerCase()} {item.product?.name?.toLowerCase()} {item.weight ? `${item.weight}${item.uom?.toUpperCase()}` : ""}</p>
                    <p className="text-xs text-gray-400">Available: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-blue-600">${item.product?.unitPrice}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={selected?.quantity || ""}
                      min={0}
                      max={Math.round(item.safeQty)}
                      onChange={(e) => updateQty(item._id, item, Number(e.target.value))}
                      className="w-16 p-2 bg-gray-100 rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}