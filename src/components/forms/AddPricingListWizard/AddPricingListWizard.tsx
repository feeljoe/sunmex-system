"use client";

import { useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2ClientPricingInfo } from "./Step2ClientPricingInfo";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { pricingListConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";

// 1. Added `price` to hold the specific override price for each item
export type SelectedProduct = {
  _id: string;
  name: string;
  sku?: string;
  price: number | ""; 
};
export type SelectedBrand = {
  _id: string;
  name: string;
  price: number | ""; 
};

export type SelectedClient = { 
  _id: string; 
  clientName: string; 
  price: number | "";
};
export type SelectedChain = { 
  _id: string; 
  name: string; 
  price: number | ""; 
};

// 2. Removed `appliesTo` since we can do both now!
export type PricingListForm = {
  name: string;
  products: SelectedProduct[];
  brands: SelectedBrand[];
  clientsAssigned: SelectedClient[];
  chainsAssigned: SelectedChain[];
  pricing: string; 
};

export default function AddPricingListWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const steps = ["Basic Info", "Client & Pricing"];
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PricingListForm>({
    name: "",
    brands: [],
    products: [],
    clientsAssigned: [],
    chainsAssigned: [],
    pricing: "",
  });

  // 3. Updated Validation
  const validateStep = (step: number, form: PricingListForm) => {
    if (step === 1) {
      if (!form.name) return false;
      // Valid if they selected at least one product OR one brand
      return form.products.length > 0 || form.brands.length > 0;
    }
    if (step === 2) {
      if (!form.pricing) return false;
      return form.clientsAssigned.length > 0 || form.chainsAssigned.length > 0;
    }
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  async function handleConfirm() {
    setError(null);
    setSubmitStatus("loading");
    try {
      // 4. Construct Payload with specific prices
      const payload: any = {
        name: form.name,
        // Legacy ID arrays to preserve backwards compatibility
        brandIds: form.brands.map((b) => b._id),
        productIds: form.products.map((p) => p._id),
        
        // NEW: Specific Overrides mapped here
        productPrices: form.products
          .filter((p) => p.price !== "")
          .map((p) => ({ product: p._id, price: Number(p.price) })),
        brandPrices: form.brands
          .filter((b) => b.price !== "")
          .map((b) => ({ brand: b._id, price: Number(b.price) })),
          
          clientsAssigned: form.clientsAssigned.map((c: any) => c._id),
          chainsAssigned: form.chainsAssigned.map((c: any) => c._id),
          clientPrices: form.clientsAssigned
            .filter((c: any) => c.price !== "")
            .map((c: any) => ({ client: c._id, price: Number(c.price) })),
          chainPrices: form.chainsAssigned
            .filter((c: any) => c.price !== "")
            .map((c: any) => ({ chain: c._id, price: Number(c.price) })),
        pricing: Number(form.pricing),
      };

      const res = await fetch("/api/pricingLists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create Pricing List");
      }
      setSubmitStatus("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Error");
      setSubmitStatus("error");
    }
  }

  async function handleSubmit() {
    setForm({
      name: "",
      brands: [],
      products: [],
      clientsAssigned: [],
      chainsAssigned: [],
      pricing: "",
    });
    setStep(1);
  }

  return (
    <>
      <div className="w-[90vw] h-[80vh] bg-(--secondary) p-5 rounded-xl shadow">
        <ProgressBar step={step} steps={steps} />
        <div className="flex flex-col gap-4 pt-5">
          <AnimatedStep>
            {step === 1 && <Step1BasicInfo form={form} setForm={setForm} />}
            {step === 2 && <Step2ClientPricingInfo form={form} setForm={setForm} />}
          </AnimatedStep>
        </div>

        {showConfirm && (
          <ConfirmModal
            open={showConfirm}
            title="Pricing List Review"
            sections={pricingListConfirmConfig}
            data={form}
            onBack={() => setShowConfirm(false)}
            onConfirm={() => {
              handleConfirm();
              setShowConfirm(false);
            }}
          />
        )}

        {submitStatus && (
          <SubmitResultModal
            status={submitStatus}
            onClose={() => {
              setSubmitStatus(null);
              if (submitStatus === "success") {
                handleSubmit();
              }
            }}
            collection="Pricing List"
            message={error || undefined}
          />
        )}
      </div>

      <div className="flex gap-4 w-full items-center justify-between mt-4">
        <div>
          <button
            hidden={step === 1}
            onClick={back}
            className="px-4 py-2 bg-gray-300 shadow-xl rounded cursor-pointer"
          >
            Go Back
          </button>
        </div>
        <div className="flex gap-4">
          {step < 2 ? (
            <button
              disabled={!validateStep(step, form)}
              onClick={next}
              className={`
                    px-6 py-2 rounded-lg text-white
                    transition-all duration-500
                    ${
                      validateStep(step, form)
                        ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                        : "bg-blue-100 cursor-not-allowed"
                    }
                `}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition-all duration-300"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </>
  );
}