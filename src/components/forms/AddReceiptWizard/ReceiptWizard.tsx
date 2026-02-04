"use client";
import { useState } from "react";
import StepSelectOrder from "./StepSelectOrder";
import StepReceiveProducts from "./StepReceiveProducts";
import StepReceiptInfo from "./StepReceiptInfo";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

export default function ReceiptWizard({currentUser}: {currentUser: string}) {
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);

  const [form, setForm] = useState<any>({
    items: [],
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const submit = async () => {
    setSubmitStatus("loading");
    try{
      await fetch("/api/supplierReceipts", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          elaboratedBy: currentUser,
        }),
      });
      setMessage("Order received successfully");
      setSubmitStatus("success");
    }catch(error: any){
      setMessage("There was a problem receiving the order");
      setSubmitStatus("error");
      throw new Error(error.message || "There was a problem receiving the order");
    }
  };

  const handleSubmit = () => {
    setForm([]);
    setStep(1);
    setMessage("");
  };

  return (
    <>
    <div className="bg-(--secondary) p-6 rounded-xl overflow-x-auto overflow-y-auto shadow w-full h-4/5">
      {step === 1 && (
        <StepSelectOrder
          form={form}
          setForm={setForm}
          onNext={next}
        />
      )}
      {step === 2 && (
        <StepReceiveProducts
          form={form}
          setForm={setForm}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <StepReceiptInfo
          form={form}
          setForm={setForm}
          onNext={next}
          onBack={back}
        />
      )}
    </div>
    <div className="flex justify-between w-full">
      <div>
            <button hidden={step === 1} onClick={back} className="px-5 py-3 bg-gray-300 rounded-xl shadow-xl cursor-pointer">
                Go Back
            </button>
        </div>
        <div className="flex gap-4">
          {step < 3 ? (
            <button hidden={step === 1} onClick={next} className={`
                px-5 py-3 rounded-xl shadow-xl font-bold text-white
                transition-all duration-500 bg-blue-500 hover:bg-blue-600 cursor-pointer
              `}>
              Next
            </button>
          ) : (
            <button onClick={() => submit()} className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
              Review
            </button>
          )}
        </div>
      </div>
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
    </>
  );
}
