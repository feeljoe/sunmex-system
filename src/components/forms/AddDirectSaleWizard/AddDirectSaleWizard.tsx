"use client";

import { useState, useMemo, useEffect } from "react";
import StepSelectClient from "./steps/Step1Client";
import StepProductsDirect from "./steps/Step2Products";
import StepReviewDirect from "./steps/Step3Review";
import StepSignature from "./steps/Step4Signature";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useRouter } from "next/navigation";

export default function DirectSaleWizard({ userRole, userId }: { userRole: any, userId: any}) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [routeData, setRouteData] = useState<any | null> (null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  // Fetch Route on Mount
  useEffect(() => {
    async function fetchRoute() {
      try {
        const res = await fetch("/api/routes/inventory");
        const data = await res.json();
        setRouteData(data);
      } catch (err) {
        console.error("Failed to fetch route:", err);
      } finally {
        setLoadingRoute(false);
      }
    }
    fetchRoute();
  }, []);

  // Calculate Total
  const grandTotal = useMemo(() => {
    return products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  }, [products]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  
  const submitSale = async () => {
    if (!signature) {
      setMessage("Signature is required to complete the sale.");
      setSubmitStatus("error");
      return;
    }

    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/direct-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          clientId: selectedClient._id,
          products: products.filter(p => p.quantity > 0).map(p => ({
            product: p.productId, // Matching your Schema requirement
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          signature,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit sale");
      }

      setSubmitStatus("success");
      setMessage("Direct Sale Completed Successfully");
      setTimeout(() => router.replace("/pages/sales/direct-sales"), 1500);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  if (loadingRoute) return <div className="p-10 text-center">Loading Route Data...</div>;
  if (!routeData && userRole === "vendor") return <div className="p-10 text-center text-red-500">No active route found for your user.</div>;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-(--secondary) px-4 py-6 rounded-lg shadow-xl flex-1 overflow-hidden">
        {step === 1 && (
          <StepSelectClient
            userRole={userRole}
            selectedClient={selectedClient}
            onSelect={(client) => { setSelectedClient(client); setStep(2); }}
          />
        )}

        {step === 2 && (
          <StepProductsDirect
            products={products}
            setProducts={setProducts}
            routeInventory={routeData.inventory} // Pass the route inventory specifically
          />
        )}

        {step === 3 && (
          <StepReviewDirect
            client={selectedClient}
            products={products.filter(p => p.quantity > 0)}
            total={grandTotal}
          />
        )}

        {step === 4 && (
          <StepSignature
            onSave={(sig: string) => setSignature(sig)}
            signature={signature}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between p-2">
        <button 
          hidden={step === 1} 
          onClick={handleBack} 
          className="px-6 py-2 bg-gray-300 rounded-xl font-bold"
        >
          Back
        </button>
        
        {step < 4 ? (
          <button 
            disabled={step === 1 && !selectedClient}
            onClick={handleNext}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={submitSale}
            className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold"
          >
            Complete Sale
          </button>
        )}
      </div>

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => setSubmitStatus(null)}
          collection="Direct Sale"
        />
      )}
    </div>
  );
}