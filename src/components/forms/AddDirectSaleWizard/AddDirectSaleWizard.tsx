"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

import Step1Client from "./steps/Step1Client";
import Step2Products from "./steps/Step2Products";
import Step3Review from "./steps/Step3Review";
import Step4Signature from "./steps/Step4Signature";

export default function AddDirectSaleWizard({ route }: { route: any }) {
  const [step, setStep] = useState(1);
  const steps = ["Client", "Products", "Review", "Signature"];

  const [form, setForm] = useState({
    clientId: "",
    products: [] as any[],
    signature: "",
  });

  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, steps.length));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="w-full bg-(--tertiary) p-10 rounded-lg shadow">
      <ProgressBar step={step} steps={steps} />

      <AnimatedStep>
        {step === 1 && (
          <Step1Client
            routeId={route._id}
            form={form}
            setForm={setForm}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Products
            routeId={route._id}
            form={form}
            setForm={setForm}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Review
            routeId={route._id}
            form={form}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Signature
            form={form}
            routeId={route._id}
            onSuccess={(newSale) => {
              setSubmitStatus("success");
              setForm({
                clientId: "",
                products: [],
                signature: "",
              });
              setStep(1);
            }}
          />
        )}
      </AnimatedStep>

      {/* Next/Back buttons only for steps 1–3 */}
      {step < 4 && (
        <div className="flex justify-between mt-6">
          <button
            disabled={step === 1}
            onClick={back}
            className="px-4 py-2 border rounded hover:bg-gray-200 transition"
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Next
          </button>
        </div>
      )}

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          collection="Direct Sale"
          onClose={() => setSubmitStatus(null)}
        />
      )}
    </div>
  );
}
