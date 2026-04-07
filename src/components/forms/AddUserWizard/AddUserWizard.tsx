"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2ContactInfo } from "./Step2ContactInfo";
import { ConfirmModal } from "../../modals/ConfirmModal";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import { userConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

export default function AddUserWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const steps = ["Basic Info", "Contact Info"];
  const [showConfirm, setShowConfirm] = useState(false);
  

  const validateStep = (step: number, form: any) => {
    if (step === 1) {
      return (
        form.firstName &&
        form.lastName &&
        form.userRole &&
        form.username &&
        form.password
      );
    }
    return true; // steps 2 & 3 are optional
  };
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    userRole: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
});
  

  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);

  const [message, setMessage] = useState<string | null> (null);

  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const submit = async (payload: any) => {
    try{
    const url = "/api/users";
        
    const method = "POST";

    const res = await fetch(url, { 
        method, 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(payload), 
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create client");
    }
    }catch(err: any){
        throw new Error(err?.error);
    }
}

  async function handleConfirm () {
      setMessage(null);
      setSubmitStatus("loading");
      try{
        const payload: any = {
            firstName: form.firstName,
            lastName: form.lastName,
            userRole: form.userRole,
            username: form.username,
            email: form.email,
            phoneNumber: form.phoneNumber,
            password: form.password,
        };
            submit(payload);
            setMessage("User added successfully");
            setSubmitStatus("success");
            if(onSuccess) onSuccess();
      }catch(err: any){
        setMessage(err.message || "Error");
        setSubmitStatus("error");
      }
    }
    async function handleSubmit(){
        setForm({
            firstName: "",
            lastName: "",
            userRole: "",
            username: "",
            email: "",
            phoneNumber: "",
            password: "",
          });
    }

  return (
    <div className="w-full p-10 bg-(--tertiary) rounded-2xl p-10 rounded-lg shadow items-center justify-center">
        <div className="">
      <ProgressBar step={step} steps={steps}/>

    <AnimatedStep>
        {step === 1 && <Step1BasicInfo form={form} setForm={setForm} />}
        {step === 2 && <Step2ContactInfo form={form} setForm={setForm} />}
    </AnimatedStep>
        <div className="flex w-full justify-between">
        <div>
            <button hidden={step === 1} onClick={back} className="px-5 py-3 rounded-xl bg-gray-300 shadow-xl cursor-pointer">
                Go Back
            </button>
        </div>
          {step < 2 ? (
            <button disabled={!validateStep(step, form)} onClick={next} className={`
                px-5 py-3 rounded-xl text-white
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
            <button onClick={() => setShowConfirm(true)} className="px-5 py-3 bg-green-600 text-white rounded-xl shadow-xl cursor-pointer">
              Review
            </button>
          )}
        </div>

      {showConfirm && (
        <ConfirmModal
          open={showConfirm}
          title={"User Info Review"}
          sections = {userConfirmConfig}
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
            message={message}
            onClose={() => {
                handleSubmit();
                setSubmitStatus(null);
                setMessage("");
            }}
            collection="User"
        />
      )}
      
      </div>
    </div>
  );
}