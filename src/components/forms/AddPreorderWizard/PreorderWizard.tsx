"use client";

import { useEffect, useMemo, useState } from "react";
import StepSelectClient from "./StepSelectClient";
import StepAddProducts from "./StepAddProducts";
import StepConfirm from "./StepConfirm";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useList } from "@/utils/useList";
import { applyPricingLists } from "@/utils/applyPricingLists";
import SelectPreorderTypeModal from "@/components/modals/SelectPreorderTypeModal";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";

type PreorderWizardProps = {
  userRole: any;
  mode?: "create" | "edit";
  existingPreorder?: any;
};

export default function PreorderWizard({
  userRole,
  mode = "create",
  existingPreorder, }: PreorderWizardProps) {
  const isEdit = mode === "edit";
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; capturedAt: Date } | null>(null);


  const [outstandingBalance, setOutstandingBalance] = useState<{ total: number, invoices: string[] } | null>(null);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);

  useEffect(() => {
    if (!existingPreorder) return;

    setSelectedClient(existingPreorder.client);

    setProducts(
      existingPreorder.products.map((p: any) => ({
        inventoryId: p.productInventory?._id,
        productId: p.productInventory?.product?._id,
        brand: p.productInventory?.product?.brand?.name,
        name: p.productInventory?.product?.name,
        unitPrice: p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0,
        weight: p.productInventory?.product?.weight,
        unit: p.productInventory?.product?.unit,
        caseSize: p.productInventory?.product?.caseSize,
        sku: p.productInventory?.product?.sku,
        quantity: p.quantity,
        pickedQuantity: p.pickedQuantity ?? 0,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        deviationReason: p.deviationReason || "",
        maxQty: Math.round(Number(p.productInventory?.currentInventory || 0)) + Math.round(Number(p.quantity || 0)),
      }))
    );

    setPreorderType(existingPreorder.type);
    setPreorderReason(existingPreorder.noChargeReason);

  }, [existingPreorder]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            capturedAt: new Date(),
          });
        },
        (error) => {
          console.warn("Could not get location: ", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    console.log("User location: ", userLocation);
  }, []);

  // STATE
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  const [invalidProducts, setInvalidProducts] = useState<string[]>([]);
  // EDIT
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<any | null>(
    existingPreorder?.client || null);
  const [products, setProducts] = useState<any[]>(
    existingPreorder?.products?.map((p: any) => ({
      inventoryId: p.productInventory?._id,
      productId: p.productInventory?.product?._id,
      brand: p.productInventory?.product?.brand?.name,
      name: p.productInventory?.product?.name,
      unitPrice: p.unitPrice,
      weight: p.productInventory?.product?.weight,
      unit: p.productInventory?.product?.unit,
      caseSize: p.productInventory?.product?.caseSize,
      sku: p.productInventory?.product?.sku,
      quantity: p.quantity,
      pickedQuantity: p.pickedQuantity ?? 0,
      deliveredQuantity: p.deliveredQuantity ?? 0,
      deviationReason: p.deviationReason || "",
      maxQty: Math.round(Number(p.productInventory?.currentInventory || 0)) + Math.round(Number(p.quantity || 0)),
    })) || []
  );

  useEffect(() => {
    if (invalidProducts.length > 0) {
      setInvalidProducts([]);
    }
  }, [products]);

  const [showPreorderType, setShowPreorderType] = useState(false);
  const [preorderType, setPreorderType] = useState(existingPreorder?.type || "");
  const [preorderReason, setPreorderReason] = useState(existingPreorder?.noChargeReason || "");

  const preorderStatus = existingPreorder?.status || "pending";

  const { items: pricingLists } = useList("/api/pricingLists", { limit: 1000 });
  const pricedProducts = useMemo(() => {
    return applyPricingLists(products, selectedClient, pricingLists).map(p => ({
      ...p,
      effectiveUnitPrice: Number(p.effectiveUnitPrice) ?? p.unitPrice ?? 0, // fallback to 0
    }));
  }, [products, selectedClient, pricingLists]);
  const total = useMemo(() => {
    return pricedProducts.reduce(
      (sum, p) => sum + p.quantity * p.effectiveUnitPrice,
      0
    );
  }, [pricedProducts]);

  const handleSelectedClient = async (client: any) => {
    setSelectedClient(client);

    if (!isEdit) {
      setSubmitStatus("loading");
      setMessage("Checking client balance...");
      
      try {
        const res = await fetch(`/api/clients/${client._id}/outstanding-balance`);
        const data = await res.json();
        
        if (data.hasBalance) {
            setOutstandingBalance({ total: data.total, invoices: data.invoices });
        } else {
            setOutstandingBalance(null);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setOutstandingBalance(null);
      }
      
      // Give the snappy UI loading modal half a second to look smooth
      setTimeout(() => {
        setSubmitStatus(null);
        setMessage("");
        setStep(2);
      }, 500);
      
    } else {
      setStep(2);
    }
  }
  // SUBMIT

  const executeSubmit = async () => {
    setSubmitStatus("loading");

    const body = {
      client: selectedClient?._id,
      location: userLocation,
      products: pricedProducts
        .filter(p => p.quantity > 0)
        .map(p => ({
          productInventory: p.inventoryId,
          quantity: p.quantity,
          unitPrice: p.effectiveUnitPrice,
          ...(isEdit && {
            pickedQuantity: p.pickedQuantity ?? 0,
            deliveredQuantity: p.deliveredQuantity ?? 0,
            deviationReason: p.deviationReason || null,
          }),
        })),
      type: preorderType,
      noChargeReason: preorderReason,
      total: preorderType === "noCharge" ? 0 : total,
    };

    const res = await fetch(
      isEdit ? `/api/preOrders/${existingPreorder._id}`
        : "/api/preOrders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      let message = error?.error || "Could not submit preorder";
      if (error?.details?.length) {
        setInvalidProducts(error.details.map((d: any) => d.inventoryId));
        message +=
          `\n\nIssues:\n\n` +
          error.details
            .map((d: any) =>
              `• ${d.name} (requested: ${d.requested ?? "-"}, available: ${d.available ?? "-"})`
            )
            .join("\n");
      }

      setMessage(message);
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("success");
    setMessage(isEdit ? "Preorder Updated" : "Preorder submitted");

    setTimeout(() => {
      router.replace("/pages/sales/preorders");
    }, 1000);
  };

  const submitPreorder = () => {
    // If there is a balance, show the warning modal first instead of submitting
    if (outstandingBalance && outstandingBalance.total > 0 && !isEdit) {
      setShowBalanceWarning(true);
    } else {
      executeSubmit();
    }
  };

  // NAVIGATION

  const validateStep = (step: number) => {
    if (step === 1) return !!selectedClient;
    return true; // steps 2 & 3 are optional
  };


  async function handleSubmit() {
    setSelectedClient(null);
    setProducts([]);
    setMessage("");
  }
  const next = () => {
    if ((step === 1 || step === 2) && userRole === "admin" && !isEdit) {
      setShowPreorderType(true);
      return;
    } else if ((step === 1 || step === 2) && userRole !== "admin" && !isEdit) {
      setPreorderType("charge");
    }
    setStep(s => Math.min(s + 1, 3))
  };
  const back = () => setStep(s => Math.max(s - 1, 1));

  return (
    <>
      <div className="bg-(--secondary) px-2 py-3 rounded-lg shadow-xl mx-auto w-full h-[75vh] overflow-hidden">
        {step === 1 && (
          <StepSelectClient
            userRole={userRole}
            selectedClient={selectedClient}
            onSelect={handleSelectedClient}
          />
        )}

        {step === 2 && (
          <StepAddProducts
            userRole={userRole}
            products={products}
            setProducts={setProducts}
            preorderStatus={preorderStatus}
            invalidProducts={invalidProducts}
            pricingLists={pricingLists}
            selectedClient={selectedClient}
            outstandingBalance={outstandingBalance}
            preorderId={existingPreorder?._id}
          />
        )}

        {step === 3 && (
          <StepConfirm
            client={selectedClient}
            products={pricedProducts}
            type={preorderType}
            total={total}
          />
        )}

        {showPreorderType && (
          <SelectPreorderTypeModal
            onCancel={() => setShowPreorderType(false)}
            client={selectedClient}
            onConfirm={(reason: string, type: string) => {
              setPreorderType(type);
              setPreorderReason(reason);
              setShowPreorderType(false);
              setStep(step === 2 ? 3 : 2);
            }}
          />
        )}

        {submitStatus && (
          <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => {
              setSubmitStatus(null);
              if (submitStatus === "success") {
                handleSubmit();
                setStep(1);
              }
            }}
            collection="Preorder"
          />
        )}

        {showBalanceWarning && outstandingBalance && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-(--secondary) p-2 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4">
            <div className="flex justify-center">
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-20 h-20 text-yellow-800 bg-yellow-400 p-2 rounded-full"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-red-600">Outstanding Balance</h2>
              <div className="bg-white rounded-xl border border-gray-200">
              <p className="text-center font-mono text-gray-700">
                <span className="font-bold capitalize">{selectedClient?.clientName}</span> has an outstanding balance of: <span className="font-bold text-red-600 text-lg">{formatCurrency(outstandingBalance.total)}</span> from the invoice / invoices:
              </p>

              <div className="bg-red-50 p-2 m-2 rounded-xl text-center font-mono font-bold border border-red-200 text-red-800 max-h-32 overflow-y-auto">
                {outstandingBalance.invoices.join(", ")}
              </div>

              <p className="text-center font-bold font-mono">Are you sure you want to make a sale for them again?</p>
              </div>
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => setShowBalanceWarning(false)}
                  className="p-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-700 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  No, Go Back
                </button>
                <button
                  onClick={() => { setShowBalanceWarning(false); executeSubmit(); }}
                  className="p-2 bg-red-400 text-red-800 hover:text-white rounded-xl hover:bg-red-800 font-bold transition-colors cursor-pointer shadow-xl"
                >
                  Yes, Make Sale
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full justify-between">
        <div>
          <button hidden={step === 1} onClick={back} className="px-5 py-3 bg-gray-300 shadow-xl rounded-xl cursor-pointer">
            Go Back
          </button>
        </div>
        <div className="flex gap-4">
          {step < 3 ? (
            <button disabled={!validateStep(step)} onClick={next} className={`
            px-5 py-3 rounded-xl font-bold text-white
            transition-all duration-500 
            ${validateStep(step)
                ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                : "bg-blue-100 cursor-not-allowed"
              }
          `}>
              Next
            </button>
          ) : (
            <button onClick={submitPreorder} className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
              {isEdit ? "Update" : "Submit"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
