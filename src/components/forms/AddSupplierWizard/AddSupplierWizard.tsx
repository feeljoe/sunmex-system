"use client";

import { useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2AddressContactInfo } from "./Step2AddressContactInfo";
import { ConfirmModal } from "../../modals/ConfirmModal";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { supplierConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";

export default function AddSupplierWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const steps = ["Basic Info", "Address & Contact Info"];
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  
  const validateStep = (step: number, form: any) => {
    if (step === 1) {
      return (
        form.name
      );
    }
    return true; // steps 2 & 3 are optional
  };
  
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phoneNumber: "",
    // address fields separated in UI, merged on submit
    addressLine: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
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
          contact: form.contact || null,
          email: form.email,
          phoneNumber: form.phoneNumber,
          billingAddress: {
            addressLine: form.addressLine,
            city: form.city,
            state: form.state || null,
            country: form.country || null,
            zipCode: form.zipCode || null,
          }
        };
  
        const res = await fetch('/api/suppliers', { 
          method: 'POST', 
          headers: {'Content-Type':'application/json'}, 
          body: JSON.stringify(payload), 
        });
  
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create client");
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
            name: "",
            contact: "",
            email: "",
            phoneNumber: "",
            // address fields separated in UI, merged on submit
            addressLine: "",
            city: "",
            state: "",
            country: "",
            zipCode: "",
          });
    }

  return (
    <div className="w-full h-full bg-(--tertiary) p-5 rounded-lg shadow">
      <ProgressBar step={step} steps={steps}/>

    <AnimatedStep>
        {step === 1 && <Step1BasicInfo form={form} setForm={setForm} />}
        {step === 2 && <Step2AddressContactInfo form={form} setForm={setForm} />}
    </AnimatedStep>
      

      <div className="flex justify-between">
        <div>
            <button hidden={step === 1} onClick={back} className="px-5 py-3 bg-gray-300 rounded-xl cursor-pointer">
                Go Back
            </button>
        </div>
        <div className="flex gap-4">
          {step < 2 ? (
            <button disabled={!validateStep(step, form)} onClick={next} className={`
                px-5 py-3 rounded-xl font-bold text-white
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
            <button onClick={() => setShowConfirm(true)} className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
              Review
            </button>
          )}
        </div>
        
      </div>

      {showConfirm && (
        <ConfirmModal
          open={showConfirm}
          title="Supplier Info Review"
          sections = {supplierConfirmConfig}
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
            collection="Supplier"
        />
      )}
    </div>
  );
}