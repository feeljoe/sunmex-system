"use client";

import { useEffect, useState } from "react";
import SubmitResultModal from "./SubmitResultModal";
import { generateSupplierOrderPDF } from "../pdfGenerator/supplierOrders/generateSupplierOrderPDF";
import { exportSupplierOrderExcel } from "../pdfGenerator/supplierOrders/exportSupplierOrderExcel";
import AsyncSearchSelect from "../ui/AsyncSearchSelect";

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
  const totalUnits = products.reduce(
    (sum:number, i:any) =>
      sum + i.quantity,
    0
  );

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
        <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full h-4/5 max-w-3xl flex flex-col gap-4 p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
                Edit Supplier Order {order.poNumber}
            </h2>
            <button onClick={onClose} className="hover:text-red-500 cursor-pointer transition-all duration:300">✕</button>
            </div>
        
          {/* Supplier */}
          <div className="flex flex-col gap-3">
            <label className="font-semibold">Supplier</label>
            <AsyncSearchSelect
              value={order.supplier}
              displayValue={order.supplier.name}
              endpoint="/api/suppliers"
              placeholder="Search supplier..."
              onChange={(supplier) => setSupplier(supplier._id)}
            />
          </div>

          {/* Products */}
          <label className="font-semibold">Products</label>
          <div className="flex-1 overflow-y-auto">
            {products.map((p, idx) => (
              <div key={idx} className="flex w-full p-2 gap-4">
                <div className="w-full">
                <AsyncSearchSelect
                  value={p.product}
                  displayValue={p.product?.name}
                  endpoint="/api/products"
                  placeholder="Search product..."
                  onChange={(product) => updateProduct(idx, "product", product)}
                />
                </div>

                <input
                  type="number"
                  min={1}
                  value={p.quantity}
                  onChange={(e) =>
                    updateProduct(idx, "quantity", Number(e.target.value))
                  }
                  className="w-24 p-2 bg-white rounded-xl shadow-xl"
                />

                <button
                  onClick={() => removeProduct(idx)}
                  className="text-red-500 font-bold bg-white px-2 py-2 rounded-xl shadow-xl"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
              onClick={addProduct}
              className="self-start px-2 py-2 bg-blue-500 rounded-xl shadow-xl text-white hover:bg-blue-300 transition-all duration:300 cursor-pointer"
              disabled={order.status === "received"}
            >
              + Add product
            </button>
          <div className="flex justify-end text-xl font-semibold">
            Units: {totalUnits}
          </div>
          <div className="flex justify-end text-xl font-semibold">
            Subtotal: ${subtotal.toFixed(2)}
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <div className="flex gap-3">
              <button
                onClick={() => generateSupplierOrderPDF(order)}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl"
              >
                Export PDF
              </button>

              <button
                onClick={() => exportSupplierOrderExcel(order)}
                className="px-4 py-2 bg-green-700 text-white rounded-xl"
              >
                Export Excel
              </button>
            </div>

            <button
              onClick={saveChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl"
              disabled={order.status === "received"}
            >
              Save Changes
            </button>
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
