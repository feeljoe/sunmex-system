"use client";

import { generatePreorderPDF } from "@/utils/generatePreorderPDF";
import { useEffect, useMemo, useState } from "react";
import SignaturePad from "../ui/SignaturePad";
import SubmitResultModal from "./SubmitResultModal";

type DeviationReason = "damaged" | "missing" | "returned";

type DeliveryProduct = {
  productInventory: string;
  product: any;
  originalQuantity: number;
  deliveredQuantity: number;
  remainingOnRoute: number;
  unitPrice: number;
  deviationReason?: DeviationReason;
};

export default function PreorderPrepareModal({
  preorder,
  onClose,
  onDelivered,
}: {
  preorder: any;
  onClose: () => void;
  onDelivered?: () => void;
}) {
  const [deliveryProducts, setDeliveryProducts] = useState<DeliveryProduct[]>([]);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  /* -----------------------------
     MAP PREORDER → LOCAL STATE
  ------------------------------*/
  useEffect(() => {
    const mapped = preorder.products.map((p: any) => ({
      productInventory: p.productInventory._id,
      product: p.productInventory.product,
      originalQuantity: p.quantity,
      deliveredQuantity: p.quantity,
      remainingOnRoute: 0,
      unitPrice: p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0,
    }));

    setDeliveryProducts(mapped);
  }, [preorder]);

  /* -----------------------------
     UPDATE DELIVERED QTY
  ------------------------------*/
  const updateQty = (productInventory: string, qty: number) => {
    setDeliveryProducts(prev =>
      prev.map(item => {
        if (item.productInventory !== productInventory) return item;

        const delivered = Math.min(
          Math.max(0, qty),
          item.originalQuantity
        );

        return {
          ...item,
          deliveredQuantity: delivered,
          remainingOnRoute: item.originalQuantity - delivered,
        };
      })
    );
  };

  /* -----------------------------
     TOTAL
  ------------------------------*/
  const deliveryTotal = useMemo(() => {
    return deliveryProducts.reduce(
      (sum, p) => sum + p.deliveredQuantity * p.unitPrice,
      0
    );
  }, [deliveryProducts]);

  const changedProducts = deliveryProducts.filter(
    p => p.deliveredQuantity !== p.originalQuantity
  );

  const handleConfirmClick = () => {
    if (changedProducts.length > 0) {
      setShowDeviationModal(true);
    } else {
      setConfirming(true);
    }
  };

  /* -----------------------------
     SUBMIT DELIVERY
  ------------------------------*/
  const submitDelivery = async () => {
    setSubmitStatus("loading");

    try {
      await fetch(`/api/preOrders/${preorder._id}/deliver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          total: deliveryTotal,
          products: deliveryProducts.map(p => ({
            productInventory: p.productInventory,
            pickedQuantity: p.originalQuantity,
            deliveredQuantity: p.deliveredQuantity,
            remainingOnRoute: p.remainingOnRoute,
            deviationReason: p.deviationReason ?? null,
          })),
        }),
      });

      setSubmitStatus("success");
      setConfirming(false);
      onDelivered?.();
      onClose();
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  /* -----------------------------
     SORT
  ------------------------------*/
  const sortedProducts = [...deliveryProducts].sort((a, b) => {
    const brandA = a.product?.brand?.name?.toLowerCase() ?? "";
    const brandB = b.product?.brand?.name?.toLowerCase() ?? "";
    if (brandA !== brandB) return brandA.localeCompare(brandB);
    return a.product?.name?.localeCompare(b.product?.name);
  });

  const formatCurrency = (v: number) => `$${v.toFixed(2)}`;

  useEffect(() => {
    document.body.style.overflow = confirming ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirming]);

  /* =============================
     RENDER
  ==============================*/
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-5xl p-6 space-y-4">

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">
            Delivery Order – {preorder.client?.clientName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Route: <strong>{preorder.routeAssigned?.code}</strong>
        </div>

        <div className="max-h-4/5 overflow-y-auto rounded-xl">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-(--tertiary)">
              <tr>
                <th className="p-2">Brand</th>
                <th className="p-2">Product</th>
                <th className="p-2">UPC</th>
                <th className="p-2 text-center">Delivered</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="bg-(--secondary)">
              {sortedProducts.map(p => (
                <tr key={p.productInventory} className="border-t">
                  <td className="p-2">{p.product?.brand?.name}</td>
                  <td className="p-2">{p.product?.name}</td>
                  <td className="p-2">{p.product?.upc}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={p.originalQuantity}
                      value={p.deliveredQuantity}
                      onChange={e =>
                        updateQty(p.productInventory, Number(e.target.value))
                      }
                      className="w-20 bg-white rounded text-center"
                    />
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(p.unitPrice)}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(p.deliveredQuantity * p.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-2xl font-semibold">
          Total: {formatCurrency(deliveryTotal)}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={() => generatePreorderPDF(preorder)}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl"
          >
            PDF
          </button>

          {preorder.status === "ready" && (
            <button
              onClick={handleConfirmClick}
              className="bg-green-600 text-white px-5 py-3 rounded-xl"
            >
              Confirm
            </button>
          )}
        </div>

        {/* DEVIATION + CONFIRM MODALS (unchanged logic, now powered by remainingOnRoute) */}
        {showDeviationModal && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 w-4/5 max-w-lg space-y-4">
      <h3 className="text-xl font-semibold text-center">
        Reason for quantity adjustment
      </h3>

      {changedProducts.map(p => (
        <div key={p.productInventory} className="flex flex-col gap-3">
          <div className="text-center font-semibold">
            {p.product.name}: {p.originalQuantity} →{" "}
            <span className="text-red-500">{p.deliveredQuantity}</span>
          </div>

          <select
            className="bg-gray-200 rounded-xl h-10 p-2"
            value={p.deviationReason ?? ""}
            onChange={e => {
              const value = e.target.value as DeviationReason;
              setDeliveryProducts(prev =>
                prev.map(item =>
                  item.productInventory === p.productInventory
                    ? { ...item, deviationReason: value }
                    : item
                )
              );
            }}
          >
            <option value="">Select reason</option>
            <option value="damaged">Product damaged</option>
            <option value="missing">Product missing</option>
            <option value="returned">Product returned</option>
          </select>
        </div>
      ))}

      <div className="flex justify-end gap-4 pt-4">
        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => setShowDeviationModal(false)}
        >
          Cancel
        </button>

        <button
          disabled={changedProducts.some(p => !p.deviationReason)}
          onClick={() => {
            setShowDeviationModal(false);
            setConfirming(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
)}

        {confirming && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-4/5 max-w-xl lg:max-w-2xl h-auto">
        <div className="flex justify-between">
        <h3 className="text-2xl font-semibold">Confirm Delivery</h3>
        <button
            onClick={() => {setConfirming(false); setSignature(null);}}
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
            onClick={() => {submitDelivery(); onDelivered;}}
            >
            Done
            </button>
        </div>
        </div>
    </div>
    )}
        {submitStatus && (
          <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => setSubmitStatus(null)}
            collection="Preorder"
          />
        )}
      </div>
    </div>
  );
}

