"use client";

import { useState } from "react";
import SignaturePad from "../ui/SignaturePad";

interface CreditMemoProduct {
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      upc: string;
      brand: {
        name: string;
      };
    };
    quantity: number;
    pickedQuantity: number;
    returnedQuantity: number;
    unitPrice?: number;
    effectiveUnitPrice?: number;
    adjusted?: boolean;
  }

export default function PrepareCreditMemoModal({
  creditMemo,
  onClose,
  onCompleted,
}: {
  creditMemo: any;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [products, setProducts] = useState<CreditMemoProduct[]>(
    creditMemo.products.map((p: CreditMemoProduct) => ({
      ...p,
      pickedQuantity: p.pickedQuantity ?? 0,
      returnedQuantity: p.returnedQuantity ?? 0,
      adjusted: false,
    }))
  );

  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalRequired = products.reduce((s: number, p: any) => s + p.quantity, 0);
  const totalPicked = products.reduce((s: number, p: any) => s + p.pickedQuantity, 0);

  const markPicked = (id: string) => {
    setProducts((prev: any[]) =>
      prev.map(p =>
        p._id === id
          ? {
              ...p,
              pickedQuantity: p.pickedQuantity === p.quantity ? 0 : p.quantity,
              returnedQuantity: p.pickedQuantity === p.quantity ? 0 : p.quantity,
            }
          : p
      )
    );
  };

  const adjustQty = (id: string, value: number) => {
    setProducts((prev: any[]) =>
      prev.map(p =>
        p._id === id
          ? {
              ...p,
              quantity: value,
              pickedQuantity: Math.min(p.pickedQuantity, value),
              returnedQuantity: Math.min(p.pickedQuantity, value),
              adjusted: true,
            }
          : p
      )
    );
  };
  const total = products.reduce((sum: number, p:any) => {
    const unitPrice = p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost?? 0;
    return sum + p.pickedQuantity * unitPrice;
  }, 0);

  const completeCreditMemo = async (sig: string | null) => {
    setSubmitting(true);

    await fetch(`/api/credit-memos/${creditMemo._id}/receive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: products.map((p) => ({
          product: p.product._id,
          pickedQuantity: p.pickedQuantity,
          returnedQuantity: p.pickedQuantity,
        })),
        total,
        signature: sig,
      }),
    });

    onCompleted();
  };

  const canSubmit = totalPicked === totalRequired;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-4xl p-6 space-y-4">
        <h2 className="font-semibold text-2xl">
          Receive Credit Memo – {creditMemo.client?.clientName}
        </h2>

        <p className="text-lg text-gray-600 text-center">
          Progress: {totalPicked} / {totalRequired}
        </p>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {products.map(p  => (
            <div
              key={p._id}
              className={`flex items-center gap-3 shadow p-3 rounded-xl ${
                p.adjusted ? "bg-yellow-50" : "bg-(--secondary)"
              }`}
            >
              <input
                type="checkbox"
                checked={p.pickedQuantity === p.quantity}
                onChange={() => markPicked(p._id)}
                className="w-8 h-8"
              />

              <div className="flex-1">
                <div className="font-semibold">
                  {p.product.brand.name} – {p.product.name}
                </div>
                <div className="text-md text-gray-600">
                  SKU: {p.product.sku} | UPC: {p.product.upc}
                </div>
              </div>

              <div className="w-24 text-center">
                {p.pickedQuantity} / {p.quantity}
              </div>

              {p.pickedQuantity === p.quantity && (
                <span className="text-xs text-green-600">Received</span>
              )}

              <button
                className="text-md text-red-600 underline"
                onClick={() => {
                  const input = prompt("Actual quantity received:", String(p.quantity));
                  if (input === null) return;
                  const val = Number(input);
                  if (!isNaN(val) && val >= 0) adjustQty(p._id, val);
                }}
              >
                not enough?
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end text-lg font-semibold pt-2">
            Total Returned: ${total.toFixed(2)}
        </div>
        { showSignature && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-4/5 max-w-xl lg:max-w-2xl h-auto">
                  <div className="flex justify-between">
                  <h3 className="text-2xl font-semibold">Confirm Returns</h3>
                  <button
                      onClick={() => {setShowSignature(false); setSignature(null);}}
                      className="text-gray-500 text-xl font-bold hover:text-black"
                  >
                      ✕
                  </button>
                  </div>
                  <SignaturePad onSave={setSignature} />
          
                  <div className="flex justify-end gap-5 pt-4">
                      <button
                      disabled={!signature}
                      className="bg-green-600 text-white px-5 py-3 rounded-xl disabled:opacity-50 cursor-pointer shadow-xl"
                      onClick={() => {completeCreditMemo(signature); setShowSignature(false);}}
                      >
                      Done
                      </button>
                  </div>
                  </div>
              </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-5 py-3 rounded-xl shadow-xl">
            Cancel
          </button>

          {!showSignature ? (
            <button
            onClick={() => setShowSignature(true)}
            disabled={!canSubmit}
            className="bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl disabled:opacity-50"
          >
            Done
          </button>
          ) : (
            <button disabled className="px-5 py-3 rounded-xl opacity-50">
              Waiting for signature…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
