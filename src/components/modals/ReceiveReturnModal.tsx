"use client";

import { useState, useEffect } from "react";

export default function ReceiveReturnModal({
  user,
  creditMemo,
  onClose,
  readOnly,
  onCompleted,
}: any) {
  const [verifiedQuantities, setVerifiedQuantities] = useState<Record<string, number>>({});
  const [driverSignature, setDriverSignature] = useState(creditMemo.driverSignature || "");
  const [warehouseSignature, setWarehouseSignature] = useState(creditMemo.warehouseSignature || "");
  const [loading, setLoading] = useState(false);

  // Initialize verified quantities with the driver's picked quantities
  useEffect(() => {
    if (creditMemo && !readOnly) {
      const initialQs: Record<string, number> = {};
      creditMemo.products.forEach((p: any) => {
        initialQs[p.product._id] = p.pickedQuantity || 0;
      });
      setVerifiedQuantities(initialQs);
    }
  }, [creditMemo, readOnly]);

  const handleSubmit = async () => {
    if (!driverSignature || !warehouseSignature) {
      alert("Both signatures are required.");
      return;
    }

    setLoading(true);

    const payloadProducts = creditMemo.products.map((p: any) => ({
      productId: p.product._id,
      pickedQuantity: p.pickedQuantity,
      warehouseVerifiedQuantity: verifiedQuantities[p.product._id],
      returnReason: p.returnReason,
    }));

    const res = await fetch("/api/warehouse/returns/complete", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditMemoId: creditMemo._id,
        products: payloadProducts,
        warehouseUser: user?.id,
        driverSignature,
        warehouseSignature,
      }),
    });

    setLoading(false);

    if (res.ok) {
      onCompleted();
    } else {
      alert("Failed to complete receiving.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-2xl font-bold">Review Return: {creditMemo.number}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
        </div>

        <div className="flex-1 overflow-auto space-y-4 pr-2">
          {creditMemo.products.map((p: any) => {
            const isMissing = verifiedQuantities[p.product._id] < p.pickedQuantity;

            return (
              <div key={p.product._id} className="p-4 border rounded-xl shadow-sm bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold">{p.product.brand?.name} {p.product.name}</div>
                  <div className={`text-sm font-semibold capitalize ${p.returnReason === 'good return' ? 'text-green-600' : 'text-orange-500'}`}>
                    {p.returnReason}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Expected: {p.pickedQuantity}</div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="text-center">
                    <label className="text-xs font-bold text-gray-500">Received</label>
                    {readOnly ? (
                      <div className="text-xl font-bold px-4">{p.warehouseVerifiedQuantity}</div>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={p.pickedQuantity}
                        value={verifiedQuantities[p.product._id] ?? ""}
                        onChange={(e) => setVerifiedQuantities(prev => ({
                          ...prev,
                          [p.product._id]: Number(e.target.value)
                        }))}
                        className={`w-24 h-10 text-center border rounded-lg focus:ring-2 outline-hidden ${isMissing ? 'border-red-500 bg-red-50' : ''}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-600">Driver Signature</label>
              <input
                disabled={readOnly}
                placeholder="Type name to sign..."
                value={driverSignature}
                onChange={(e) => setDriverSignature(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600">Warehouse Signature</label>
              <input
                disabled={readOnly}
                placeholder="Type name to sign..."
                value={warehouseSignature}
                onChange={(e) => setWarehouseSignature(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors">
              Close
            </button>
            {!readOnly && (
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Complete Receiving"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}