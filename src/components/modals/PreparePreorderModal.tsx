"use client";

import { useState } from "react";

export default function PrepareOrderModal({
    user,
    preorder,
    onClose,
    onCompleted,
}: {
    user: any;
    preorder: any;
    onClose: () => void;
    onCompleted: () => void;
}){
    const [products, setProducts] = useState(
        preorder.products.map((p: any) => ({
            ...p,
            pickedQuantity: p.pickedQuantity ?? 0,
            adjusted: false,
        }))
    );
    const totalRequired = products.reduce(
        (s: any, p: { quantity: any; }) => s + p.quantity,
        0
      );      
    const totalPicked = products.reduce(
        (s: number, p: any) => s + p.pickedQuantity, 0
    );

    const markPicked = (id: string) => {
        setProducts((prev: any[]) =>
          prev.map((p) => 
            p._id === id
            ?{
                ...p,
                pickedQuantity:
                    p.pickedQuantity === p.quantity
                    ? 0 : p.quantity,
             }
            : p
            )
        );
      };
      

      const adjustQty = (id: string, value: number) => {
        setProducts((prev: any[]) =>
          prev.map((p) =>
            p._id === id
              ? {
                  ...p,
                  quantity: value,
                  pickedQuantity: Math.min(p.pickedQuantity, value),
                  adjusted: true,
                }
              : p
          )
        );
      };
      

    const completePreorder = async () => {
        await fetch(`/api/preOrders/${preorder._id}/complete`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                products: products.map((p: any) => ({
                    productInventory : p.productInventory._id,
                    pickedQuantity: p.pickedQuantity,
                })),
                assembledBy: user.id,
            }),
        });
        onCompleted();
    };

    const sortedProducts = [...products].sort((a,b) => {
        const brandA = a.productInventory.product.brand.name.toLowerCase();
        const brandB = b.productInventory.product.brand.name.toLowerCase();
        if(brandA !== brandB) return brandA.localeCompare(brandB);
        return a.productInventory.product.name.localeCompare(b.productInventory.product.name);
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-4xl p-6 space-y-4">
                <h2 className="font-semibold text-2xl">
                    Prepare Order - {preorder.client?.clientName}
                </h2>
                <p className={`text-lg text-gray-600 text-center`}>
                    Progress: {totalPicked} / {totalRequired}
                </p>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {sortedProducts.map((p) => (
                        <div
                            key={p._id}
                            className={`flex items-center gap-3 shadow p-3 rounded-xl ${p.adjusted ? "bg-yellow-50" : "bg-(--secondary)"}`}
                        >
                            <input type="checkbox" checked={p.pickedQuantity === p.quantity} onChange={() => markPicked(p._id)} className="w-8 h-8"/>

                            <div className="flex-1">
                                <div className="font-semibold">
                                    {p.productInventory.product.brand.name} - {p.productInventory.product.name}
                                </div>
                                <div className="text-md text-gray-600">
                                    SKU: {p.productInventory.product.sku} | UPC: {p.productInventory.product.upc}
                                </div>
                            </div>

                            <div className="w-24 text-center">
                                {p.pickedQuantity} / {p.quantity}
                            </div>
                            {p.pickedQuantity === p.quantity && (
                                <span className="text-xs text-green-600">
                                    Picked
                                </span>
                            )}
                            <button
                                className="text-md text-red-600 underline cursor-pointer"
                                onClick={() => {
                                    const input = (prompt("Actual quantity received:", 
                                        String(p.quantity))
                                    );
                                    if(input === null) return;
                                    const val = Number(input);

                                    if(!isNaN(val) && val >=0) {
                                        adjustQty(p._id, val);
                                    }
                                }}
                                >
                                    not enough?
                                </button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl shadow-xl">
                        Cancel
                    </button>
                    <button 
                        onClick={completePreorder}
                        disabled={totalPicked !== totalRequired}
                        className="bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl disabled:opacity-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}