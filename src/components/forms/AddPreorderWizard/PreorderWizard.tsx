"use client";

import { useEffect, useMemo, useState } from "react";
import StepSelectClient from "./StepSelectClient";
import StepAddProducts from "./StepAddProducts";
import StepConfirm from "./StepConfirm";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useList } from "@/utils/useList";
import { applyPricingLists } from "@/utils/applyPricingLists";
import SelectPreorderTypeModal from "@/components/modals/SelectPreorderTypeModal";

type PreorderWizardProps ={
    userRole: any;
    mode?: "create" | "edit";
    existingPreorder?: any;
};

export default function PreorderWizard({
  userRole,
  mode ="create",
  existingPreorder,}: PreorderWizardProps) {
    const isEdit = mode === "edit";
    
    useEffect(() => {
      if (!existingPreorder) return;
    
      setSelectedClient(existingPreorder.client);
    
      setProducts(
        existingPreorder.products.map((p:any) => ({
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
          maxQty: p.productInventory?.currentInventory,
        }))
      );
    
      setPreorderType(existingPreorder.type);
      setPreorderReason(existingPreorder.noChargeReason);
    
    }, [existingPreorder]);

    // STATE
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
   // EDIT
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<any | null>(
    existingPreorder?.client || null);
  const [products, setProducts] = useState<any[]>(
    existingPreorder?.products?.map((p:any)=>({
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
      maxQty: p.productInventory?.currentInventory, // editing shouldn't limit inventory unless you want
    })) || []
  );
  const [showPreorderType, setShowPreorderType] = useState(false);
  const [preorderType, setPreorderType] = useState(existingPreorder?.type || "");
  const [preorderReason, setPreorderReason] = useState(existingPreorder?.noChargeReason || "");

  const {items: pricingLists } = useList("/api/pricingLists", {limit: 1000});
  const pricedProducts = useMemo(() => {
    return applyPricingLists(products, selectedClient, pricingLists).map(p => ({
      ...p,
      effectiveUnitPrice: Number(p.effectiveUnitPrice) || p.unitPrice ||0, // fallback to 0
    }));
  }, [products, selectedClient, pricingLists]);
  const total = useMemo(() => {
    return pricedProducts.reduce(
      (sum, p) => sum + p.quantity * p.effectiveUnitPrice,
      0
    );
  }, [pricedProducts]);

 // SUBMIT

  const submitPreorder = async () => {
    setSubmitStatus("loading");

    const body = {
      client: selectedClient?._id,
      products: pricedProducts.filter(p => p.quantity > 0),
      type: preorderType,
      noChargeReason: preorderReason,
      total: preorderType === "noCharge" ? 0 : total,
    };

    const res = await fetch(
      isEdit? `/api/preOrders/${existingPreorder._id}`
      : "/api/preOrders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if(!res.ok){
      const error = await res.json();
      setMessage(error?.error || "Could not submit preorder");
      return;
    }
    setSubmitStatus("success");
    setMessage(isEdit? "Preorder Updated" : "Preorder submitted");
  };

  // NAVIGATION

  const validateStep = (step: number) => {
    if (step === 1) return !!selectedClient;
    return true; // steps 2 & 3 are optional
  };


  async function handleSubmit(){
    setSelectedClient(null);
    setProducts([]);
    setMessage("");
  }
  const next = () => {
    if(step===1 && userRole === "admin" && !isEdit){
      setShowPreorderType(true);
      return;
    }else if(step===1 && userRole !== "admin" && !isEdit){
      setPreorderType("charge");
    }
    setStep(s => Math.min(s + 1, 3))
    };
  const back = () => setStep(s => Math.max(s - 1, 1));

  return (
    <>
    <div className="bg-(--secondary) px-2 py-3 rounded-lg shadow-xl mx-auto w-full h-4/5 overflow-x-auto overflow-y-auto">
      {step === 1 && (
        <StepSelectClient
          userRole={userRole}
          selectedClient={selectedClient}
          onSelect={setSelectedClient}
        />
      )}

      {step === 2 && (
        <StepAddProducts
          userRole={userRole}
          products={products}
          setProducts={setProducts}
          selectedClient={selectedClient}
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
          onConfirm={(reason:string, type:string) => {
          setPreorderType(type);
          setPreorderReason(reason);
          setShowPreorderType(false);
          setStep(2);
          }}
        />
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
            collection="Preorder"
        />
      )}
    </div>
    <div className="flex w-full justify-between mt-4">
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
            ${
              validateStep(step)
                ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                : "bg-blue-100 cursor-not-allowed"
            }
          `}>
          Next
        </button>
      ) : (
        <button onClick={submitPreorder} className="px-5 py-3 bg-green-600 text-white rounded-xl cursor-pointer">
          {isEdit? "Update" : "Submit"}
        </button>
      )}
    </div>
  </div>
  </>
  );
}
