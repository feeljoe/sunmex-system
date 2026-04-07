"use client";

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from "react";

export default function PrepareTruckLoadModal({
  load,
  onClose,
  onCompleted,
}: any) {
  const [products, setProducts] = useState(
    load.products.map((p: any) => ({
      ...p,
      pickedQuantity: p.pickedQuantity ?? 0,
      actualQuantity: p.actualQuantity ?? p.quantity,
    }))
  );

  const totalRequired = products.reduce(
    (s: number, p: any) => s + p.actualQuantity,
    0
  );

  const totalPicked = products.reduce(
    (s: number, p: any) => s + p.pickedQuantity,
    0
  );

  const markPicked = (id: string) => {
    setProducts((prev: any[]) =>
      prev.map(p =>
        p._id === id
          ? {
              ...p,
              pickedQuantity:
                p.pickedQuantity === p.actualQuantity
                  ? 0
                  : p.actualQuantity,
            }
          : p
      )
    );
  };

  async function completeLoad() {
    await fetch(`/api/truck-loads/${load._id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: products.map((p: { productInventory: { _id: any; }; actualQuantity: any; }) => ({
          productInventory: p.productInventory._id,
          actualQuantity: p.actualQuantity,
        })),
      }),
    });

    onCompleted();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-4xl p-6 space-y-4">
        <h2 className="font-semibold text-2xl">
          Prepare Truck – Route {load.route.code}
        </h2>

        <p className="text-center text-lg">
          Progress: {totalPicked} / {totalRequired}
        </p>

        {products.map((p: { _id: string; pickedQuantity: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; actualQuantity: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; productInventory: { product: { brand: { name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; }; }) => (
          <div
            key={p._id}
            className="flex items-center gap-3 bg-(--secondary) p-3 rounded-xl"
          >
            <input
              type="checkbox"
              checked={p.pickedQuantity === p.actualQuantity}
              onChange={() => markPicked(p._id)}
              className="w-8 h-8"
            />

            <div className="flex-1">
              {p.productInventory.product.brand.name} –{" "}
              {p.productInventory.product.name}
            </div>

            <div>
              {p.pickedQuantity}/{p.actualQuantity}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={completeLoad}
            disabled={totalPicked !== totalRequired}
            className="bg-green-600 text-white px-5 py-3 rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
