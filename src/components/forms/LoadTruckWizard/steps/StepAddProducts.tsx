"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";

export default function StepAddProducts({
  products,
  setProducts,
  onBack,
  onNext,
}: any) {
  const { items: inventory } = useList("/api/productInventory");
  const [available, setAvailable] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    setAvailable(
      (inventory || []).filter(
        (inv: any) =>
          inv.currentInventory > 0 &&
          !products.find((p: { inventoryId: any; }) => p.inventoryId === inv._id)
      )
    );
  }, [inventory, products]);

  const addProduct = () => {
    const inv = available.find(p => p._id === selectedId);
    if (!inv) return;

    setProducts((prev: any[]) => [
      ...prev,
      {
        inventoryId: inv._id,
        productId: inv.product._id,
        name: inv.product.name,
        maxQty: inv.currentInventory,
        quantity: 1,
      },
    ]);
    setSelectedId("");
  };

  const updateQty = (id: string, qty: number) => {
    setProducts((prev: any[]) =>
      prev.map(p =>
        p.inventoryId === id
          ? { ...p, quantity: Math.min(qty, p.maxQty) }
          : p
      )
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Add Products</h2>

      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 border p-2 rounded"
        >
          <option value="">Select product</option>
          {available.map((inv: any) => (
            <option key={inv._id} value={inv._id}>
              {inv.product.name} ({inv.currentInventory})
            </option>
          ))}
        </select>

        <button
          onClick={addProduct}
          disabled={!selectedId}
          className="btn-primary"
        >
          Add
        </button>
      </div>

      {products.map((p: any) => (
        <div key={p.inventoryId} className="flex gap-3 items-center">
          <span className="flex-1">{p.name}</span>
          <input
            type="number"
            min={1}
            max={p.maxQty}
            value={p.quantity}
            onChange={e => updateQty(p.inventoryId, +e.target.value)}
            className="w-20 border p-1 rounded"
          />
        </div>
      ))}

      <div className="flex justify-between">
        <button onClick={onBack}>Back</button>
        <button
          onClick={onNext}
          disabled={!products.length}
          className="btn-primary"
        >
          Review
        </button>
      </div>
    </div>
  );
}
