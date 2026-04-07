// StepAddProducts.tsx
"use client";

import { useList } from "@/utils/useList";

export default function ProductStep({
    mode,
    products,
    setProducts,
    onBack,
    onNext,
}: {
  mode: "preorder" | "direct";
  products: any[];
  setProducts: (p: any[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const inventoryEndpoint =
    mode === "direct"
    ? "/api/routes/inventory"
    : "/api/productInventory";

  const {items: inventory} = useList(inventoryEndpoint);

  const addProduct = (item: any) => {
    if(products.find((p) => p.productInventory._id === item._id)) return;

    setProducts([
      ...products,
      {
        productInventory: item,
        quantity: 1,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Add products</h2>
      <button
        onClick={onBack}
        className="text-lg text-blue-500 underline cursor-pointer"
      >
        ← Back to clients
      </button>
      <div className="grid grid-cols-1 lg-grid-cols-2 gap-4">
        {/* Inventory */}
        <div className="border rounded-lg max-h-96 overflow-y-auto">
          {inventory.map((it: any) => (
            <div
              key={it._id}
              className="p-3 border-b flex justify-between items-center"
            >
              <div>
                <p className="font-medium">
                  {it.product?.name}
                </p>
                <p className="text-sm text-gray-500">
                  Available: {it.quantity}
                </p>
              </div>

              <button
                onClick={() => addProduct(it)}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Add
              </button>
            </div>
          ))}
        </div>

        {/* Selected */}
        <div className="border rounded-lg max-h-96 overflow-y-auto">
          {products.map((p, idx) => (
            <div
              key={idx}
              className="p-3 border-b flex justify-between"
            >
              <span>{p.productInventory.product.name}</span>
              <input
                type="number"
                min={1}
                value={p.quantity}
                onChange={(e) => {
                  const next = [...products];
                  next[idx].quantity = Number(e.target.value);
                  setProducts(next);
                }}
                className="w-20 border rounded px-2"
              />
            </div>
          ))}
        </div>
        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Next
        </button>
      </div>
    </div>
  )
}