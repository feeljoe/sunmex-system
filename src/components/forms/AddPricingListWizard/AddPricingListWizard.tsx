"use client";

import { useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2ClientPricingInfo } from "./Step2ClientPricingInfo";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { pricingListConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";

type SelectedProduct = {
  _id: string;
  name: string;
  sku?: string;
};
type SelectedBrand = {
  _id: string;
  name: string;
};

type PricingListForm = {
  name: string;
  appliesTo: "product" | "brand";
  products: SelectedProduct[];
  brands: SelectedBrand[];
  clientsAssigned: string[];
  chainsAssigned: string[];
  pricing: string;
  appliesToClients: "client" | "chain";
}
export default function AddPricingListWizard({ onSuccess }: { onSuccess?: () => void }){
    const [step, setStep] = useState(1);
  const steps = ["Basic Info", "Client & Pricing"];
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  const [confirmData, setConfirmData] = useState<any>(null);
  const validateStep = (step: number, form: PricingListForm) => {
    if (step === 1) {
      if(!form.name) return false;
      if(form.appliesTo === "product"){
        return form.products.length > 0;
      }
      if(form.appliesTo === "brand"){
        return form.brands.length > 0;
      }
    }
    if(step === 2) {
        if(!form.pricing) return false;
        if(form.appliesToClients === "client"){
          return form.clientsAssigned.length > 0;
        }
        if(form.appliesToClients === "chain"){
          return form.chainsAssigned.length > 0;
        }
    }
    return true;
  };

  const [form, setForm] = useState<PricingListForm>({
    name: "",
    appliesTo: "product",
    brands:[],
    products:[],
    clientsAssigned: [],
    chainsAssigned: [],
    pricing: "",
    appliesToClients: "client",
  });
  const [error, setError] = useState<string | null> (null);
  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 1));

  async function handleConfirm () {
    setError(null);
    setSubmitStatus("loading");
    try{
      const payload: any = {
        name: form.name,
        brandIds: form.brands.map((b: { _id: any; }) => b._id),
        productIds: form.products.map((p: { _id: any; }) => p._id),
        clientsAssigned: form.clientsAssigned,
        chainsAssigned: form.chainsAssigned,
        pricing: Number(form.pricing),
      };

      const res = await fetch('/api/pricingLists', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(payload), 
      });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || "Failed to create Pricing List");
    }
    setSubmitStatus("success");
    if(onSuccess) onSuccess();
    }catch(err: any){
      setError(err.message || "Error");
      setSubmitStatus("error");
    }
  }
    async function handleSubmit(){
        setForm({
            name:"",
            appliesTo:"product",
            brands:[],
            products:[],
            clientsAssigned:[],
            chainsAssigned:[],
            pricing: "",
            appliesToClients: "client",
        });
        setStep(1);
    }

    return (
      <>
        <div className="w-full h-full bg-(--tertiary) p-5 rounded-xl shadow overflow-hidden">
          <ProgressBar step={step} steps={steps}/>
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
                      // submit to API here
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
                    handleSubmit();
                    setStep(1);
                }}
                collection="Pricing List"
            />
          )}
        </div>
        <div className="flex gap-4 w-full items-center justify-between">
        <div>
            <button hidden={step === 1} onClick={back} className="px-4 py-2 bg-gray-300 shadow-xl rounded cursor-pointer">
                Go Back
            </button>
        </div>
      <div className="flex gap-4">
            {step < 2 ? (
                <button disabled={!validateStep(step, form)} onClick={next} className={`
                    px-6 py-2 rounded-lg text-white
                    transition-all duration-500
                    ${
                    validateStep(step, form)
                        ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                        : "bg-blue-100 cursor-not-allowed"
                    }
                `}>
                Next
                </button>
            ) : (
                <button onClick={() => {
                  /*const previewData = {
                    ...form,
                    productIds: resolvePreviewItems(form.productIds, products),
                    brandIds: resolvePreviewItems(form.brandIds, brands),
                    clientsAssigned: resolvePreviewItems(form.clientsAssigned, clients),
                    chainsAssigned: resolvePreviewItems(form.chainsAssigned, chains),
                  }
                  setConfirmData(previewData);*/
                    setShowConfirm(true)}} className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer">
                Review
                </button>
            )}
        </div>
        </div>
        </>
      );
}