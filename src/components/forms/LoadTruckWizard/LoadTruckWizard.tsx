"use client";

import { useEffect, useState } from "react";
import StepSelectRoute from "./steps/StepSelectRoute";
import StepAddProducts from "./steps/StepAddProducts";
import StepConfirm from "./steps/StepConfirm";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

type Props = {
  userRole: string;
  userId: string;
};

export default function LoadTruckWizard({ userRole, userId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [route, setRoute] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);

  /* ------------------ AUTO LOAD ROUTE (onRoute) ------------------ */
  useEffect(() => {
    if (userRole === "onRoute") {
      fetch("/api/routes/my")
        .then(res => res.json())
        .then(routes => {
          if (routes?.length) {
            setRoute(routes[0]);
            setStep(2);
          }
        });
    }
  }, [userRole]);

  /* ------------------ SUBMIT ------------------ */
  async function submitLoad() {
    if (!route) return;
    setSubmitStatus("loading");

    try {
      const res = await fetch(`/api/routes/${route._id}/load-truck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: products.filter(p => p.quantity > 0),
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setSubmitStatus("success");
    } catch {
      setSubmitStatus("error");
    }
  }

  return (
    <div className="bg-(--secondary) p-6 rounded-lg shadow max-w-3xl mx-auto">
      {/* STEP 1: ADMIN ONLY */}
      {step === 1 && userRole === "admin" && (
        <StepSelectRoute
          selectedRoute={route}
          onSelect={setRoute}
          onNext={() => setStep(2)}
        />
      )}

      {/* STEP 2 */}
      {step === 2 && route && (
        <StepAddProducts
          products={products}
          setProducts={setProducts}
          onBack={() => setStep(userRole === "admin" ? 1 : 2)}
          onNext={() => setStep(3)}
        />
      )}

      {/* STEP 3 */}
      {step === 3 && route && (
        <StepConfirm
          route={route}
          products={products}
          onBack={() => setStep(2)}
          onSubmit={submitLoad}
        />
      )}

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          collection="Truck Load"
          onClose={() => {
            setSubmitStatus(null);
            setStep(1);
            setProducts([]);
            setRoute(null);
          }}
        />
      )}
    </div>
  );
}
