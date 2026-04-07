"use client";

import { useState } from "react";
import SignaturePad from "@/components/ui/SignaturePad";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

export default function Step4Signature({
  form,
  routeId,
  onSuccess,
}: {
  form: any;
  routeId: string;
  onSuccess: (newSale: any) => void;
}) {
  const [signature, setSignature] = useState<string | null>(form.signature || null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (!signature) {
      alert("Please provide a signature before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitStatus("loading");

    try {
      const res = await fetch("/api/direct-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          clientId: form.clientId,
          products: form.products.map((p: any) => ({
            productInventory: p.productInventory,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create Direct Sale");
      }

      setSubmitStatus("success");
      setErrorMessage("Direct Sale submitted");
      onSuccess(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error submitting direct sale");
      setSubmitStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = form.products.reduce(
    (sum: number, p: any) => sum + p.quantity * p.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Client Signature & Finalize Sale</h2>

      <div className="border p-4 rounded-lg">
        <p className="font-semibold mb-2">Products Summary:</p>
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
                <td className="p-2">${(p.quantity * p.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-semibold mt-2 text-right">
          Grand Total: ${grandTotal.toFixed(2)}
        </p>
      </div>

      <SignaturePad onSave={(dataUrl) => setSignature(dataUrl)} />

      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-300"
        >
          {submitting ? "Submitting..." : "Submit Direct Sale"}
        </button>
      </div>

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={errorMessage}
          onClose={() => setSubmitStatus(null)}
          collection="Direct Sale"
        />
      )}
    </div>
  );
}
