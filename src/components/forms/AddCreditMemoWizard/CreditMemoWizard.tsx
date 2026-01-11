"use client";

import { useEffect, useMemo, useState } from "react";
import StepSelectClient from "./StepSelectClient";
import StepAddProducts from "./StepAddProducts";
import StepConfirm from "./StepConfirm";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useList } from "@/utils/useList";
import { applyPricingLists } from "@/utils/applyPricingLists";
import ReturnReasonModal from "@/components/modals/ReturnReasonModal";

type CreditMemoWizardProps ={
    userRole: any;
};

export default function CreditMemoWizard({userRole}: CreditMemoWizardProps) {
      
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showReasonModal, setShowReasonModal] = useState(false);

  const {items: pricingLists } = useList("/api/pricingLists", {limit: 1000});
  
  const pricedProducts = useMemo(() => {
    return applyPricingLists(products, selectedClient, pricingLists);
  }, [products, selectedClient, pricingLists]);
  
    const total = useMemo(() => {
    return pricedProducts.reduce(
      (sum, p) => sum + p.quantity * p.effectiveUnitPrice,
      0
    );
  }, [pricedProducts]);

  const validateStep = (step: number) => {
    if (step === 1) return !!selectedClient;
    return true; // steps 2 & 3 are optional
  };


  const submitCreditMemo = async () => {
    setSubmitStatus("loading");

    const productsWithCost = products
    .filter(p => p.quantity > 0)
    .map((p) => {
        const priced = pricedProducts.find(pp => pp.productId === p.productId);
        return {
            product: p.productId,
            quantity: p.quantity,
            actualCost: priced?.effectiveUnitPrice ?? p.basePrice ?? 0,
            returnReason: p.returnReason,
        };
    });

    const res = await fetch("/api/credit-memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: selectedClient?._id,
        products: productsWithCost,
        total,
      }),
    });

    if(!res.ok){
      const error = await res.json();
      setMessage(error?.error || "Could not submit credit memo");
    }
    setSubmitStatus("success");
    setMessage("Credit memo submitted");
  };

  async function handleSubmit(){
    setSelectedClient(null);
    setProducts([]);
    setMessage("");
  }
  const next = () => {
    if (step === 2) {
      setShowReasonModal(true);
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };
  const back = () => setStep(s => Math.max(s - 1, 1));

  return (
    <>
    <div className="bg-(--secondary) p-6 rounded-lg shadow-xl mx-auto w-full h-4/5 overflow-x-auto overflow-y-auto">
      {step === 1 && (
        <StepSelectClient
          userRole={userRole}
          selectedClient={selectedClient}
          onSelect={setSelectedClient}
        />
      )}

      {step === 2 && (
        <StepAddProducts
          products={products}
          setProducts={setProducts}
          selectedClient={selectedClient}
        />
      )}

      {step === 3 && (
        <StepConfirm
          client={selectedClient}
          products={pricedProducts}
          total={total}
        />
      )}
      {showReasonModal && (
        <ReturnReasonModal
            products={products}
            onCancel={() => setShowReasonModal(false)}
            onConfirm={(updated) => {
            setProducts(updated);
            setShowReasonModal(false);
            setStep(3);
            }}
        />
        )}
      
      {submitStatus && (
        <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => {
                setSubmitStatus(null);
                handleSubmit();
                setStep(1);
            }}
            collection="Credit Memo"
        />
      )}
    </div>
    <div className="flex w-full justify-between">
    <div>
        <button hidden={step === 1} onClick={back} className="px-5 py-3 bg-gray-300 shadow-xl rounded-xl cursor-pointer">
            Go Back
        </button>
    </div>
    <div className="flex gap-4">
      {step < 3 ? (
        <button disabled={!validateStep(step)} onClick={next} className={`
            px-5 py-3 rounded-xl font-bold text-white
            transition-all duration-500 
            ${
              validateStep(step)
                ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                : "bg-blue-100 cursor-not-allowed"
            }
          `}>
          Next
        </button>
      ) : (
        <button onClick={submitCreditMemo} className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
          Submit
        </button>
      )}
    </div>
  </div>
  </>
  );
}
