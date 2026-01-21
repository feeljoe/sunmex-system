"use client";

import { useEffect, useState } from "react";
import SubmitResultModal from "./SubmitResultModal";
import { generateSupplierOrderPDF } from "../pdfGenerator/supplierOrders/generateSupplierOrderPDF";
import { exportSupplierOrderExcel } from "../pdfGenerator/supplierOrders/exportSupplierOrderExcel";

interface Props {
  open: boolean;
  order: any;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditSupplierOrderModal({
  open,
  order,
  onClose,
  onUpdated,
}: Props) {
  const [supplier, setSupplier] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setSupplier(order.supplier?._id);
      setProducts(order.products || []);
    }
  }, [order]);

  if (!open || !order) return null;

  const updateProduct = (idx: number, field: string, value: any) => {
    const copy = [...products];
    copy[idx] = { ...copy[idx], [field]: value };
    setProducts(copy);
  };

  const removeProduct = (idx: number) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const addProduct = () => {
    setProducts([
      ...products,
      { product: null, quantity: 1, unit: "units" },
    ]);
  };
  const calculateSubtotal = () => {
    return products.reduce((sum, p) => {
      const cost = p.product?.unitCost || 0; // <-- adjust field name
      return sum + cost * (p.quantity || 0);
    }, 0);
  };  

  const subtotal = calculateSubtotal();

  const saveChanges = async () => {
    setSubmitStatus("loading");
    setMessage(null);

    try {
      await fetch(`/api/supplierOrders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier,
          products,
          expectedTotal: subtotal,
        }),
      });

      setSubmitStatus("success");
      setMessage("Supplier order updated successfully");
      onUpdated();
      onClose();
    } catch (err: any) {
      setSubmitStatus("error");
      setMessage(err.message || "Error updating order");
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
                Edit SupplierOrder {order.poNumber}
            </h2>
            <button onClick={onClose}>✕</button>
            </div>
        

        <div className="flex flex-col gap-4">
          {/* Supplier */}
          <div>
            <label className="font-semibold">Supplier</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={order.status === "received"}
            >
              {/* reuse your SupplierSelect logic here */}
            </select>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-3">
            <label className="font-semibold">Products</label>

            {products.map((p, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <select
                  value={p.product?._id || ""}
                  onChange={(e) =>
                    updateProduct(idx, "product", e.target.value)
                  }
                  className="flex-1 p-2 border rounded"
                >
                  {/* reuse product select */}
                </select>

                <input
                  type="number"
                  min={1}
                  value={p.quantity}
                  onChange={(e) =>
                    updateProduct(idx, "quantity", Number(e.target.value))
                  }
                  className="w-24 p-2 border rounded"
                />

                <button
                  onClick={() => removeProduct(idx)}
                  className="text-red-500 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={addProduct}
              className="self-start text-blue-600"
              disabled={order.status === "received"}
            >
              + Add product
            </button>
          </div>
          <div className="flex justify-end text-lg font-semibold">
            Subtotal: ${subtotal.toFixed(2)}
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <div className="flex gap-3">
              <button
                onClick={() => generateSupplierOrderPDF(order)}
                className="px-4 py-2 bg-gray-700 text-white rounded"
              >
                Export PDF
              </button>

              <button
                onClick={() => exportSupplierOrderExcel(order)}
                className="px-4 py-2 bg-green-700 text-white rounded"
              >
                Export Excel
              </button>
            </div>

            <button
              onClick={saveChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded"
              disabled={order.status === "received"}
            >
              Save Changes
            </button>
          </div>
        </div>
        </div>
      </div>

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => setSubmitStatus(null)}
          collection="Supplier Order"
        />
      )}
    </>
  );
}
