"use client";

import { useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { StepInfo } from "./StepInfo";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

export default function AddChainWizard({ onSuccess }: { onSuccess?: () => void }){
    const [step, setStep] = useState(1);
  const steps = ["Chain Name"];
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
    name:"",
  });
  const [error, setError] = useState<string | null> (null);
  async function handleConfirm () {
    setError(null);
    setSubmitStatus("loading");
    try{
      const payload: any = {
        name: form.name,
      };

      const res = await fetch('/api/chains', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(payload), 
      });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || "Failed to create product");
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
        });
    }

    return (
        <div className="w-full bg-(--tertiary) p-5 rounded-lg shadow">
          <ProgressBar step={step} steps={steps}/>
          <div className="flex flex-col gap-4 pt-5">
            {step === 1 && <StepInfo form={form} setForm={setForm} />}
            <div className="flex mt-10 justify-end">
              {step <= 1 ? (
                <button disabled={!validateStep(step, form)} onClick={() => handleConfirm()} className={`
                    px-5 py-3 rounded-xl text-white
                    transition-all duration-500
                    ${
                      validateStep(step, form)
                        ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                        : "bg-blue-100 cursor-not-allowed"
                    }
                  `}>
                  Save Chain
                </button>
              ) : (
                <button className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
                  Review
                </button>
              )}
            </div>
          </div>
          {submitStatus && (
            <SubmitResultModal
                status={submitStatus}
                onClose={() => {
                    setSubmitStatus(null);
                    handleSubmit();
                    setStep(1);
                }}
                collection="Chain"
            />
          )}
        </div>
      );
}