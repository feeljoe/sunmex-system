"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { StepInfo } from "./StepInfo";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { supplierOrderConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";

export default function AddSupplierOrderWizard({ onSuccess, user }: { onSuccess?: () => void; user: any; }){
  const [step, setStep] = useState(1);
  const steps = ["Order Info"];
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const validateStep = (step: number, form: any) => {
    if (step === 1) {
      return (
        form.supplier &&
        form.products
      );
    }
    return true; // steps 2 & 3 are optional
  };
  const [form, setForm] = useState({
    poNumber: "",
    supplier: "",
    products: [],
    requestedAt: new Date(),
    elaboratedBy: user?.name,
    status: "pending",
    expectedTotal: 0,
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
          fetch("/api/supplierOrders/next-po")
          .then(res => res.json())
          .then(data => {
              setForm((prev: any) => ({ ...prev, poNumber: data.poNumber}));
          });
      }, []);
  async function handleConfirm () {
    setMessage("");
    setSubmitStatus("loading");
    try{
      const payload: any = {
        poNumber: form.poNumber,
        supplier: form.supplier,
        products: form.products,
        requestedAt: form.requestedAt,
        elaboratedBy: form.elaboratedBy,
        status: form.status,
        expectedTotal: form.expectedTotal,
      };
      console.log("SUBMITTING ORDER: ", form);
      const res = await fetch('/api/supplierOrders', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(payload), 
      });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || "Failed to create Order");
    }
    setMessage("Order added successfully");
    setSubmitStatus("success");
    if(onSuccess) onSuccess();
    }catch(err: any){
      setMessage(err.message || "Error");
      setSubmitStatus("error");
    }
  }
    async function handleSubmit(){
        setForm({
            poNumber: "",
            supplier: "",
            products: [],
            requestedAt: new Date(),
            elaboratedBy: user?.name,
            status: "pending",
            expectedTotal: 0,
        });
        setOpenConfirm(false);
    }
    if (status === "loading") return null;
    return (
        <div className="w-full h-auto bg-(--tertiary) p-10 rounded-lg shadow">
          <ProgressBar step={step} steps={steps}/>
          <div className="flex flex-col gap-4 pt-10">
            {step === 1 && <StepInfo form={form} setForm={setForm} />}
            <div className="flex mt-10 justify-left">
              {step <= 1 ? (
                <button disabled={!validateStep(step, form)} onClick={() => setOpenConfirm(true)} className={`
                    px-6 py-4 rounded-lg text-white
                    transition-all duration-500
                    ${
                      validateStep(step, form)
                        ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                        : "bg-blue-100 cursor-not-allowed"
                    }
                  `}>
                  Continue
                </button>
              ) : (
                <button className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer">
                  Review
                </button>
              )}
            </div>
          </div>
          {openConfirm && (
            <ConfirmModal
                open={openConfirm}
                title="Order review"
                sections={supplierOrderConfirmConfig}
                data={form}
                onConfirm={handleConfirm}
                onBack={() => setOpenConfirm(false)}/>
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
                collection="Order"
            />
          )}
        </div>
      );
}