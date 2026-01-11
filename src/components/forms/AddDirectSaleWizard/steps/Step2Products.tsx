"use client";

import { useEffect, useState } from "react";

type RouteInventoryItem = {
  productInventoryId: string;
  productName: string;
  available: number;
  unitPrice: number;
};

export default function Step2Products({
  routeId,
  form,
  setForm,
  onNext,
  onBack,
}: {
  routeId: string;
  form: any;
  setForm: (v: any) => void;
  onNext: () => void;
  onBack:() => void;
}) {
  const [inventory, setInventory] = useState<RouteInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInventory() {
      const res = await fetch(`/api/routes/${routeId}/inventory`);
      const data = await res.json();
      setInventory(data);
      setLoading(false);
    }
    loadInventory();
  }, [routeId]);

  const updateQuantity = (
    productInventoryId: string,
    quantity: number
  ) => {
    setForm((prev: any) => {
      const existing = prev.products.find(
        (p: any) => p.productInventory === productInventoryId
      );

      if (existing) {
        return {
          ...prev,
          products: prev.products.map((p: any) =>
            p.productInventory === productInventoryId
              ? { ...p, quantity }
              : p
          ),
        };
      }

      const product = inventory.find(
        (i) => i.productInventoryId === productInventoryId
      );

      return {
        ...prev,
        products: [
          ...prev.products,
          {
            productInventory: productInventoryId,
            productName: product?.productName,
            available: product?.available,
            unitPrice: product?.unitPrice,
            quantity,
          },
        ],
      };
    });
  };

  if (loading) return <p>Loading inventory...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Add Products</h2>

      <div className="space-y-4">
        {inventory.map((item) => {
          const selected = form.products.find(
            (p: any) => p.productInventory === item.productInventoryId
          );

          return (
            <div
              key={item.productInventoryId}
              className="flex items-center justify-between border p-4 rounded-lg"
            >
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-sm text-gray-500">
                  Available: {item.available}
                </p>
              </div>

              <input
                type="number"
                min={0}
                max={item.available}
                value={selected?.quantity || ""}
                onChange={(e) =>
                  updateQuantity(
                    item.productInventoryId,
                    Number(e.target.value)
                  )
                }
                className="w-24 p-2 border rounded"
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center">
        <button
            onClick={onBack}
            className="bg-gray-200 text-xl px-5 py-3 cursor-pointer"
        > 
            Go back
        </button>
        <button
            onClick={onNext}
            className="bg-blue-500 text-xl text-white px-5 py-3 cursor-pointer"
        > 
            Next
        </button>
      </div>
    </div>
  );
}
