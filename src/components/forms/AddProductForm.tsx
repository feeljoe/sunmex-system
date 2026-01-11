"use client";
import React, { useEffect, useState } from 'react';

type FormState = {
  sku: string;
  vendorSku?: string;
  upc: string;
  brand: string;
  name: string;
  unitCost?: number | "";
  unitPrice?: number | "";
  productType?: "";
  productFamily?: "";
  productLine?: "";
  caseSize?: "";
  layerSize?: "";
  palletSize?: "";
  weight?: "";
  imageFile?: File | null;
  imageUrl?: string | null;
}

export default function AddProductForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState<FormState>({
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null> (null);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  const [brands, setBrands] = useState<{_id: string; name: string}[]>([]);

  useEffect(() => { (async () => { const r = await fetch('/api/brands'); if (r.ok) setBrands(await r.json()); })(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  } 

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if(file) {
      setForm(prev =>({...prev, imageFile: file, imageUrl: URL.createObjectURL(file) }));
    }
  }

  function removeImage(e?: React.MouseEvent){
    e?.stopPropagation();
    setForm(prev => ({ ...prev, imageFile: null, imageUrl: null }));
  }

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

  async function handleSubmit (e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try{
      let imageUrl: string | null = null;

      if(form.imageFile){
        setUploading(true);
        imageUrl = await uploadImageToCloudinary(form.imageFile);
        setUploading(false);
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
    if(onSuccess) onSuccess();
    }catch(err: any){
      setUploading(false);
      setError(err.message || "Error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-(--primary) p-6 rounded-xl shadow-2xl">
      <div className='flex flex-col justify-center items-center'>
        <h2 className='text-2xl font-semibold'>Add Product</h2>
        {error && <p className="text-lg text-red-500 mt-2">{error}</p>}
      </div>
      <div className='flex flex-col pt-5 items-center'>
        <label className='text-gray-200 text-xl'>Product Image</label>
        <div className='relative w-40 h-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-300 transition' onClick={() => document.getElementById("productImageInput")?.click()}>
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt="Preview"
              className='w-full h-full object-cover rounded-t-2xl'
            />
          ) : (
            <div className='text-gray-300 text-m  hover:text-blue-300'>Click to Upload</div>
          )}
        </div>
        {form.imageUrl && (
            <button
              type="button"
              onClick={removeImage}
              className="bg-red-600 text-white rounded-b-lg w-39 h-10 flex items-center justify-center text-4xl hover:bg-red-700"
            >
              &times;
            </button>
          )}
        <input id='productImageInput' type='file' accept='image/*' className='hidden' onChange={handleFileChange}/>
        <p className='text-sm text-red-500 mt-2'> PNG, JPG, GIF up to 10MB.</p>
        {uploading && <p className="text-sm text-blue-500 mt-2">Uploading image...</p>}
      </div>
      <div className='grid grid-cols-3 gap-3 pt-10'>
        <input name="sku" value={form.sku} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl" placeholder="SKU" required={true}/>
        <input name='vendorSku' value={form.vendorSku} onChange={handleChange} placeholder='Vendor SKU' className='bg-white p-3 rounded shadow-xl'/>
        <input name='upc' value={form.upc} onChange={handleChange} placeholder='UPC' className='bg-white p-3 rounded shadow-xl' required/>
      </div>
      <div className='grid grid-cols-2 gap-3 pt-10'>
        <select name='brand' value={form.brand} onChange={handleChange} className='bg-white p-3 rounded shadow-xl' required>
          <option value='1' className='text-gray-300'>Select Brand</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded shadow-xl' required/>
      </div>
      <div className='grid grid-cols-3 gap-3 pt-10'>
        <input name='productType' value={form.productType} onChange={handleChange} placeholder='Type' className='bg-white p-3 rounded shadow-xl'/>
        <input name='productFamily' value={form.productFamily} onChange={handleChange} placeholder='Family' className='bg-white p-3 rounded shadow-xl'/>
        <input name='productLine' value={form.productLine} onChange={handleChange} placeholder='Line' className='bg-white p-3 rounded shadow-xl'/>
      </div>
      <div className='grid grid-cols-2 gap-3 pt-10'>
        <input name='unitCost' type='number' step={0.01} min={0} value={form.unitCost} onChange={handleChange} placeholder='Unit Cost' className='bg-white p-3 rounded shadow-xl'/>
        <input name='unitPrice' type='number' step={0.01} min={0} value={form.unitPrice} onChange={handleChange} placeholder='Unit Price' className='bg-white p-3 rounded shadow-xl'/>
      </div>
      <div className='grid grid-cols-4 gap-3 pt-10 pb-10'>
        <input name='caseSize' type='number' value={form.caseSize} onChange={handleChange} placeholder='Case Size' className='bg-white p-3 rounded shadow-xl'/>
        <input name='layerSize' type='number' value={form.layerSize} onChange={handleChange} placeholder='Layer Size' className='bg-white p-3 rounded shadow-xl'/>
        <input name='palletSize' type='number' value={form.palletSize} onChange={handleChange} placeholder='Pallet Size' className='bg-white p-3 rounded shadow-xl'/>
        <input name='weight' type='number' value={form.weight} onChange={handleChange} placeholder='Weight' className='bg-white p-3 rounded shadow-xl'/>
      </div>
      <div className='flex justify-center items-center'>
        <button type='submit' className='bg-(--quarteary) text-white px-5 py-3 rounded shadow-xl transition-all duration:300 hover:bg-(--tertiary) hover:text-gray-700 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer'>
          {uploading ? "Uploading..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}
