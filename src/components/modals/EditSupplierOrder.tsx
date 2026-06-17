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
  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setSupplier(order.supplier);
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
          supplier: supplier?._id,
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
      <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-[70vw] p-6 lg:max-w-[90vw] max-h-[90vh]">

        {/* HEADER */}
        <div className="flex justify-between items-center py-2 mb-4 border-b">
          <h2 className="lg:text-2xl font-semibold">
            Supplier Receipt Summary
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 cursor-pointer transition-all duration:300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
          {/* Supplier */}
          <div className="flex flex-col gap-3 px-2 font-bold text-center">
            <label className="text-xl border-b font-bold">Supplier</label>
            <AsyncSearchSelect
              value={supplier}
              displayValue={supplier?.name}
              endpoint="/api/suppliers"
              placeholder="Search supplier..."
              onChange={(supplier) => setSupplier(supplier)}
            />
          </div>

          {/* Products */}
          
          <div className="h-94 lg:h-200 overflow-auto rounded-xl shadow-xl mb-4 mt-2">
            <label className="flex justify-center font-bold text-xl border-b px-2 w-full">Products</label>
          <div className="flex-1 overflow-y-auto">
            {products.map((p, idx) => (
              <div key={idx} className="flex w-full p-2 gap-4">
                <div className="w-full font-bold">
                <AsyncSearchSelect
                  value={p.product}
                  displayValue={`${p.product?.brand?.name} ${p.product?.name} ${p.product?.weight ? `(${p.product.weight + p.product.unit.toUpperCase()}) `:""}${p.product?.caseSize ? `(${p.product.caseSize} per case) `:""}SKU:(${p.product?.sku})`}
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
                  className="w-24 font-bold p-2 bg-white rounded-xl shadow-xl text-center"
                />

                <button
                  onClick={() => removeProduct(idx)}
                  className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 cursor-pointer transition-all duration:300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
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
                className="px-2 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-400 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </button>

              <button
                onClick={() => exportSupplierOrderExcel(order)}
                className="px-2 py-2 bg-green-600 text-white rounded-xl hover:bg-green-400 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                </svg>
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
