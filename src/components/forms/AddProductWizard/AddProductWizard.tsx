// AddProductWizard.tsx
"use client";

import { useState } from "react";
import { ProgressBar } from "../../ui/ProgressBar";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2Packaging } from "./Step2Packaging";
import { Step3Image } from "./Step3Image";
import { ConfirmModal } from "../../modals/ConfirmModal";
import { AnimatedStep } from "@/components/ui/AnimatedStep";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { productConfirmConfig } from "@/components/modals/configConfirms/confirmConfig";
import { useLookupMap } from "@/utils/useLookupMap";

export default function AddProductWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const steps = ["Basic Info", "Packaging", "Image"];
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  const validateStep = (step: number, form: any) => {
    if (step === 1) {
      return (
        form.sku &&
        form.upc &&
        form.brand &&
        form.name &&
        form.unitCost &&
        form.unitPrice
      );
    }
    return true; // steps 2 & 3 are optional
  };
  
  const [form, setForm] = useState({
    sku: "",
    vendorSku: "",
    upc: "",
    brand: "",
    name: "",
    unitCost: "",
    unitPrice: "",
  
    productType: "",
    productFamily: "",
    productLine: "",
    caseSize: "",
    layerSize: "",
    palletSize: "",
    weight:"",
  
    imageFile: null,
    imageUrl: null,
  });
  

  const [error, setError] = useState<string | null> (null);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 1));

  async function uploadImageToCloudinary(file: File){
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);

    const res = await fetch(url, {method: "POST", body: fd });
    if(!res.ok){
      throw new Error("Cloudinary upload failed");
    }
    const json = await res.json();
    return json.secure_url as string;
  }

  async function handleConfirm () {
      setError(null);
      setSubmitStatus("loading");
      try{
        let imageUrl: string | null = null;
  
        if(form.imageFile){
          imageUrl = await uploadImageToCloudinary(form.imageFile);
        }
        const payload: any = {
          sku: form.sku,
          vendorSku: form.vendorSku || null,
          upc: form.upc,
          brand: form.brand,
          name: form.name,
          productType: form.productType || null,
          productFamily: form.productFamily || null,
          productLine: form.productLine || null,
          unitCost: form.unitCost ? Number(form.unitCost) : null,
          unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
          caseSize: form.caseSize ? Number(form.caseSize) : null,
          layerSize: form.layerSize ? Number(form.layerSize) : null,
          palletSize: form.palletSize ? Number(form.palletSize) : null,
          weight: form.weight ? Number(form.weight) : null,
          image: imageUrl,
        };
  
        const res = await fetch('/api/products', { 
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
            sku: "",
            vendorSku: "",
            upc: "",
            brand: "",
            name: "",
            productType: "",
            productFamily: "",
            productLine: "",
            unitCost: "",
            unitPrice: "",
            caseSize: "",
            layerSize: "",
            palletSize: "",
            weight: "",
            imageFile: null,
            imageUrl: null,
          });
    }

    const {map: brandMap} = useLookupMap("/api/brands");

  return (
    <div className="w-full bg-(--tertiary) p-5 rounded-xl shadow-xl">
      <ProgressBar step={step} steps={steps}/>

    <AnimatedStep>
        {step === 1 && <Step1BasicInfo form={form} setForm={setForm} />}
        {step === 2 && <Step2Packaging form={form} setForm={setForm} />}
        {step === 3 && <Step3Image form={form} setForm={setForm} />}
    </AnimatedStep>
      

      <div className="flex justify-between">
      <div>
            <button hidden={step === 1} onClick={back} className="px-5 py-3 bg-gray-300 rounded-xl shadow-xl cursor-pointer">
                Go Back
            </button>
        </div>
        <div className="flex gap-4">
          {step < 3 ? (
            <button disabled={!validateStep(step, form)} onClick={next} className={`
                px-5 py-3 rounded-xl shadow-xl font-bold text-white
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
          title="Product Info Review"
          sections={productConfirmConfig({brandMap})}
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
            collection="Product"
        />
      )}
    </div>
  );
}
