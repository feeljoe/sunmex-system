"use client";

import { useEffect, useState } from "react";
import SubmitResultModal from "./SubmitResultModal";
import { uploadImageToCloudinary } from "../ui/uploadToCloudinary";
import AsyncSearchSelect from "../ui/AsyncSearchSelect";

interface Props {
  open: boolean;
  product: any;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditProductModal({
  open,
  product,
  onClose,
  onUpdated,
}: Props) {
  const [form, setForm] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const UNIT_OPTIONS = ["g","kg","mg","oz","lb","fl oz","ml","l"];
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize form with existing product
  useEffect(() => {
    if (!product) return;
    setForm({
      sku: product.sku,
      vendorSku: product.vendorSku,
      upc: product.upc,
      brand: product.brand?._id || product.brand,
      name: product.name,
      productType: product.productType,
      productFamily: product.productFamily,
      productLine: product.productLine,
      unitCost: product.unitCost,
      unitPrice: product.unitPrice,
      caseSize: product.caseSize,
      layerSize: product.layerSize,
      palletSize: product.palletSize,
      weight: product.weight,
      unit: product.unit,
      image: product.image,
    });
  }, [product]);

  if (!open || !product) return null;

  async function saveChanges() {
    setSubmitStatus("loading");
    setMessage(null);

    try {
      const payload: any = {};

      // Only include changed fields
      Object.keys(form).forEach(key => {
        if (form[key] !== product[key]) {
          payload[key] = form[key];
        }
      });

      // Handle image upload
      if (removeImage) {
        payload.image = null;
      }
      if (imageFile) {
        payload.image = await uploadImageToCloudinary(imageFile);
      }

      // If nothing changed, do nothing
      if (Object.keys(payload).length === 0) {
        setSubmitStatus("success");
        setMessage("No changes detected");
        onClose();
        return;
      }

      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Update failed");
      }

      setSubmitStatus("success");
      setMessage("Product updated successfully");
      onUpdated();
      onClose();
    } catch (err: any) {
      setSubmitStatus("error");
      setMessage(err.message || "Error updating product");
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-2 max-h-4/5 overflow-auto">

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Edit Product – {product.name}
            </h2>
            <button onClick={onClose}>✕</button>
          </div>
            <div className="flex flex-col">
            <label className="font-bold p-2 capitalize">Name (current: {product.name.toLowerCase()})</label>
            <input
              value={form.name || ""}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
              className="p-2 rounded-xl bg-white shadow-xl"
            />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="font-bold p-2">
                  Brand (current: {product.brand.name})
                </label>
                <AsyncSearchSelect
                  value={form.brand}
                  displayValue={product.brand?.name}
                  endpoint="/api/brands"
                  placeholder="Search brand..."
                  onChange={(id) => setForm({ ...form, brand: id })}
                />
              </div>
              <div className="flex flex-col">
                <label className="p-2 font-bold">SKU (current: {product.sku})</label>
              <input
                value={form.sku || ""}
                onChange={e => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU"
                className="p-2 rounded-xl bg-white shadow-xl"
              />
              </div>
              <div className="flex flex-col">
                <label className="p-2 font-bold">Vendor SKU (current: {product.vendorSku})</label>
              <input
                value={form.vendorSku || ""}
                onChange={e => setForm({ ...form, vendorSku: e.target.value })}
                placeholder="Vendor SKU"
                className="p-2 rounded-xl bg-white shadow-xl"
              />
              </div>
              <div className="flex flex-col">
                <label className="p-2 font-bold"> UPC (current: {product.upc})</label>
              <input
                value={form.upc || ""}
                onChange={e => setForm({ ...form, upc: e.target.value })}
                placeholder="UPC"
                className="p-2 rounded-xl bg-white shadow-xl"
              />
              </div>
              <div className="flex flex-col">
                <label className="font-bold p-2"> Cost</label>
                <input
                  value={form.unitCost || ""}
                  onChange={e =>
                    setForm({ ...form, unitCost: Number(e.target.value) })
                  }
                  min={0}
                  
                  placeholder="Unit cost"
                  type="number"
                  className="p-2 rounded-xl bg-white shadow-xl"
                />
              </div>
              <div className="flex flex-col">
                <label className="font-bold p-2"> Price</label>
                <input
                  value={form.unitPrice || ""}
                  onChange={e =>
                    setForm({ ...form, unitPrice: Number(e.target.value) })
                  }
                  min={0}
                  
                  placeholder="Unit price"
                  type="number"
                  className="p-2 rounded-xl bg-white shadow-xl"
                />
              </div>
              <div className="flex flex-col">
                <label className="font-bold p-2">Weight</label>
                <input
                  type="number"
                  min={0}
                  value={form.weight || ""}
                  onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
                  className="p-2 rounded-xl bg-white shadow-xl"
                />
              </div>
              <div className="flex flex-col">
                <label className="font-bold p-2">Unit</label>
                <select
                  value={form.unit || ""}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  className="p-2 rounded-xl bg-white shadow-xl h-10"
                >
                  <option value="">Select unit</option>
                  {UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              {[
                ["caseSize", "Case Size"],
                ["layerSize", "Layer Size"],
                ["palletSize", "Pallet Size"],
              ].map(([key, label]) => (
                <div key={key} className="flex flex-col">
                  <label className="font-bold p-2">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={form[key] || ""}
                    onChange={e =>
                      setForm({ ...form, [key]: Number(e.target.value) })
                    }
                    className="p-2 rounded-xl bg-white shadow-xl"
                  />
                </div>
              ))}
              </div>
              <div className="flex flex-col">
                <label className="font-bold p-2">Product Image</label>
                {(imageFile || form.image) && (
                  <div className="relative w-40 h-40">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : form.image}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-xl shadow-xl"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setForm({ ...form, image: null });
                        setRemoveImage(true);
                      }}
                      className="absolute top-0 bg-red-500 text-white px-2 py-1 rounded text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    setImageFile(e.target.files?.[0] || null);
                    setRemoveImage(true);
                  }}
                  className={`cursor-pointer p-2`}
                />
              </div>
          <button
            onClick={saveChanges}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl"
          >
            Save Changes
          </button>
        </div>
      </div>
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => setSubmitStatus(null)}
          collection="Product"
        />
      )}
    </>
  );
}
