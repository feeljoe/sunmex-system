"use client";

import { useState, useMemo, useEffect } from "react";
import StepSelectClient from "./steps/Step1Client";
import StepProductsDirect from "./steps/Step2Products";
import StepReviewDirect from "./steps/Step3Review";
import StepSignature from "./steps/Step4Signature";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useRouter } from "next/navigation";
import { useList } from "@/utils/useList";
import { applyPricingLists } from "@/utils/applyPricingLists";

export default function DirectSaleWizard({ 
  userRole, 
  userId,
  mode = "create",
  existingDirectSale,
}: { 
  userRole: any, 
  userId: any,
  mode?: "create" | "edit",
  existingDirectSale?: any
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [step, setStep] = useState(isEdit ? 2 : 1); 

  const [routeData, setRouteData] = useState<any | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const [selectedClient, setSelectedClient] = useState<any | null>(existingDirectSale?.client || null);
  const [products, setProducts] = useState<any[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  // 1. Fetch Pricing Lists
  const { items: pricingLists } = useList("/api/pricingLists", { limit: 1000 });

  // 2. Initialize Edit State
  useEffect(() => {
    if (isEdit && existingDirectSale) {
      setProducts(existingDirectSale.products.map((p: any) => ({
        productId: p.product?._id || p.product,
        name: p.product?.name,
        brand: p.product?.brand?.name,
        unitPrice: p.unitPrice, 
        customPrice: p.unitPrice, // Lock the historical price so pricing lists don't override past sales
        quantity: p.quantity,
      })));
    }
  }, [isEdit, existingDirectSale]);

  // Fetch Route
  useEffect(() => {
    async function fetchRoute() {
      try {
        let url = "/api/routes/inventory";
        if (isEdit && existingDirectSale?.route) {
          const routeId = existingDirectSale.route._id || existingDirectSale.route;
          url = `/api/routes/${routeId}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRouteData(data.inventory ? data : { inventory: data.inventory || [] });
        }
      } catch (err) {
        console.error("Failed to fetch route:", err);
      } finally {
        setLoadingRoute(false);
      }
    }
    fetchRoute();
  }, [isEdit, existingDirectSale]);

  // 3. Apply Pricing Lists and Overrides
  const pricedProducts = useMemo(() => {
    const evaluated = applyPricingLists(products, selectedClient, pricingLists);
    
    return evaluated.map(p => {
      const defaultPrice = p.effectiveUnitPrice ?? p.unitPrice ?? 0;
      // If user typed a custom price, use it. Otherwise, use pricing list / default.
      const finalPrice = (p.customPrice !== undefined && p.customPrice !== null && p.customPrice !== "")
        ? Number(p.customPrice)
        : defaultPrice;

      return { ...p, finalPrice };
    });
  }, [products, selectedClient, pricingLists]);

  const grandTotal = useMemo(() => {
    return pricedProducts.reduce((sum, p) => sum + p.quantity * p.finalPrice, 0);
  }, [pricedProducts]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  
  const submitSale = async () => {
    if (!isEdit && !signature) {
      setMessage("Signature is required to complete the sale.");
      setSubmitStatus("error");
      return;
    }

    setSubmitStatus("loading");
    try {
      const endpoint = isEdit ? `/api/direct-sales/${existingDirectSale._id}` : "/api/direct-sales";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          clientId: selectedClient._id,
          // Use pricedProducts and map finalPrice to unitPrice for the database
          products: pricedProducts.filter(p => p.quantity > 0).map(p => ({
            product: p.productId,
            quantity: p.quantity,
            unitPrice: p.finalPrice, 
          })),
          signature: isEdit ? undefined : signature, 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${isEdit ? "update" : "submit"} sale`);
      }

      setSubmitStatus("success");
      setMessage(`Direct Sale ${isEdit ? "Updated" : "Completed"} Successfully`);
      setTimeout(() => router.replace("/pages/sales/direct-sales"), 1500);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  if (loadingRoute) return <div className="p-10 text-center">Loading Route Data...</div>;
  if (!routeData && userRole === "vendor") return <div className="p-10 text-center text-red-500">No active route found.</div>;

  const maxStep = isEdit ? 3 : 4;

  return (
    <div className="flex flex-col h-full space-y-4 w-full">
      <div className="bg-(--secondary) px-4 py-6 rounded-lg shadow-xl flex-1 overflow-hidden">
        {step === 1 && (
          <StepSelectClient
            userRole={userRole}
            selectedClient={selectedClient}
            onSelect={(client: any) => { setSelectedClient(client); setStep(2); }}
          />
        )}

        {step === 2 && (
          <StepProductsDirect
            userRole={userRole}
            products={pricedProducts}
            setProducts={setProducts}
            routeInventory={routeData?.inventory || []}
          />
        )}

        {step === 3 && (
          <StepReviewDirect
            client={selectedClient}
            // Map finalPrice back to unitPrice so Step3Review reads it correctly without needing updates
            products={pricedProducts.filter(p => p.quantity > 0).map(p => ({...p, unitPrice: p.finalPrice}))}
            total={grandTotal}
          />
        )}

        {step === 4 && !isEdit && (
          <StepSignature
            onSave={(sig: string) => setSignature(sig)}
            signature={signature}
          />
        )}
      </div>

      <div className="flex justify-between p-2">
        <button 
          hidden={step === 1} 
          onClick={handleBack} 
          className="px-6 py-2 bg-gray-300 rounded-xl font-bold hover:bg-gray-400"
        >
          Back
        </button>
        
        {step < maxStep ? (
          <button 
            disabled={step === 1 && !selectedClient}
            onClick={handleNext}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-blue-600 ml-auto"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={submitSale}
            className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 ml-auto"
          >
            {isEdit ? "Update Sale" : "Complete Sale"}
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