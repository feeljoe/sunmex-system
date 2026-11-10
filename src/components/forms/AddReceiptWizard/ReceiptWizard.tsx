"use client";
import { useState, useRef } from "react";
import StepSelectOrder from "./StepSelectOrder";
import StepReceiveProducts from "./StepReceiveProducts";
import StepReviewReceipt from "./StepReviewReceipt";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { getReceiptIssues, isReceiptReady } from "@/utils/receiptValidation";

export default function ReceiptWizard({ currentUser: _currentUser }: { currentUser: string }) {
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<any>({
    items: [],
    invoice: "",
  });

  const [reviewAttempt, setReviewAttempt] = useState(0);
  const readyForReview = isReceiptReady(form);
  const remainingIssues = getReceiptIssues(form);

  const handleReviewReceipt = () => {
    if (readyForReview) {
      goToStep(3);
      return;
    }
    setReviewAttempt((prev) => prev + 1);
  };


  const validateReceipt = () => {
    if (!form.supplierOrderId) {
      throw new Error("Please select a supplier order.");
    }

    const issues = getReceiptIssues(form);
    if (issues.length > 0) {
      throw new Error(issues[0].message);
    }
  };

  const submit = async () => {
    if (submitting) return;

    try {
      validateReceipt();
    } catch (error: any) {
      setMessage(error.message);
      setSubmitStatus("error");
      return;
    }

    setSubmitting(true);
    setSubmitStatus("loading");
    setMessage("Receiving supplier order...");

    try {
      const payload = {
        invoice: form.invoice.trim(),
        supplierOrderId: form.supplierOrderId,

        items: form.items.map((item: any) => ({
          product: item.product._id,
          orderedQuantity: Number(item.orderedQuantity),
          receivedQuantity: Number(item.receivedQuantity),
          unitCost: Number(item.unitCost),
          actualCost: Number(item.actualCost),
        
          lots:
            Number(item.receivedQuantity) > 0
              ? item.lots.map((lot: any) => ({
                  quantity: Number(lot.quantity),
                  expirationDate:
                    lot.expirationChoice === "date"
                      ? lot.expirationDate
                      : null,
                }))
              : [],
        })),
      };

      const res = await fetch("/api/supplierReceipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Failed to receive supplier order."
        );
      }

      setMessage("Supplier order received successfully.");
      setSubmitStatus("success");
    } catch (error: any) {
      setMessage(
        error.message ||
        "There was a problem receiving the order."
      );
      setSubmitStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultClose = () => {
    const wasSuccess = submitStatus === "success";

    setSubmitStatus(null);
    setMessage("");

    if (wasSuccess) {
      setForm({ items: [], invoice: "" });
      setStep(1);
    }
  };

  const goToStep = (nextStep: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setStep(nextStep);
  };

  return (
    <>
      <div className="flex h-[92dvh] w-full min-h-0 flex-col overflow-hidden rounded-xl bg-(--secondary) shadow-xl">
        {/* WIZARD STEPS */}
        <div className="flex shrink-0 gap-2 bg-(--tertiary) p-2">
          {[
            "Select Order",
            "Receive Products",
            "Review",
          ].map((label, index) => {
            const stepNumber = index + 1;
            const checkMark = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>;

            return (
              <div
                key={label}
                className={`flex gap-2 min-w-0 flex-1 rounded-lg p-2 justify-center items-center text-center text-[11px] font-bold md:text-sm ${step === stepNumber
                  ? "bg-blue-600 text-white"
                  : step > stepNumber
                    ? "bg-green-500 text-white"
                    : "bg-white/60 text-gray-700"
                  }`}
              >
                <span className="block md:inline">
                  {step > stepNumber ? checkMark : stepNumber}
                </span>
                <span className="inline">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP CONTENT */}
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {step === 1 && (
            <StepSelectOrder
              form={form}
              setForm={setForm}
              onNext={() => goToStep(2)}
            />
          )}

          {step === 2 && (
            <StepReceiveProducts
              form={form}
              setForm={setForm}
              reviewAttempt={reviewAttempt}
            />
          )}

          {step === 3 && (
            <StepReviewReceipt
              form={form}
            />
          )}
        </div>

        {/* BOTTOM NAVIGATION */}
        {(step === 2 || step === 3) && (
          <div className="z-20 flex shrink-0 items-center justify-between border-t border-gray-200 bg-white p-2 pb-[max(12px,env(safe-area-inset-bottom))]">
            {step === 2 ? (
              <>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="min-h-11 shrink-0 rounded-xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-300 sm:px-5 sm:text-sm"
                >
                  Back to Orders
                </button>
                <button
                  type="button"
                  onClick={handleReviewReceipt}
                  title={readyForReview ? "Review the completed receipt" : "Check missing receipt information"}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:px-5 sm:text-sm ${readyForReview
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-700 hover:bg-orange-200"
                    }`}
                >
                  {readyForReview ? (
                    "Review Receipt"
                  ) : (
                    <>
                      <span>Review Receipt</span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-red-700">
                        {remainingIssues.length}
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* EDIT RECEIPT */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => goToStep(2)}
                  className="min-h-11 shrink-0 rounded-xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm"
                >
                  Edit Receipt
                </button>

                {/* CONFIRM RECEIPT */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submit}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Receiving...
                    </>
                  ) : (
                    "Confirm Receipt"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={handleResultClose}
          collection="Supplier Receipt"
        />
      )}
    </>
  );
}