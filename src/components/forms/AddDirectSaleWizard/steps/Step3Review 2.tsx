"use client";

import { useState } from "react";
import { generateDirectSalePDF } from "@/utils/generateDirectSalePDF";

export default function Step3Review({
  form,
  routeId,
  onNext,
  onBack,
}: {
  form: any;
  routeId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const grandTotal = form.products.reduce(
    (sum: number, p: any) => sum + p.quantity * p.unitPrice,
    0
  );

  const handleGeneratePDF = () => {
    setGeneratingPDF(true);
    try {
      generateDirectSalePDF({
        ...form,
        routeId,
        total: grandTotal,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Review Direct Sale</h2>

      <div className="border p-4 rounded-lg">
        <p className="font-semibold">Client:</p>
        <p>{form.clientName || "Not selected"}</p>
      </div>

      <div className="border p-4 rounded-lg">
        <p className="font-semibold mb-2">Products:</p>
        <table className="w-full text-left border">
          <thead>
            <tr className="border-b">
              <th className="p-2">Product</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Unit Price</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {form.products.map((p: any) => (
              <tr key={p.productInventory}>
                <td className="p-2">{p.productName}</td>
                <td className="p-2">{p.quantity}</td>
                <td className="p-2">${p.unitPrice.toFixed(2)}</td>
                <td className="p-2">
                  ${(p.quantity * p.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-semibold mt-2 text-right">
          Grand Total: ${grandTotal.toFixed(2)}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <button
            onClick={onBack}
            className="bg-gray-200 text-xl px-5 py-3 cursor-pointer"
        > 
            Go back
        </button>
        <button
          onClick={handleGeneratePDF}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-300"
          disabled={generatingPDF}
        >
          {generatingPDF ? "Generating..." : "Generate PDF"}
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-300"
        >
          Continue to Signature
        </button>
      </div>
    </div>
  );
}
