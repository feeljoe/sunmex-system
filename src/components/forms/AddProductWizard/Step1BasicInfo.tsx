import { useList } from "@/utils/useList";
import React, { useEffect, useState } from "react";

// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    const [brands, setBrands] = useState<{_id: string; name: string}[]>([]);
    const { items } = useList('/api/brands');

    useEffect(() => {if(items) setBrands(items);});
    
      function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
      } 
    return (
      <div className="flex flex-col mb-10">
        <label className="text-center font-bold">Product Info</label>
        <div className='grid lg:grid-cols-3 gap-3 mt-5 mb-5'>
        <input name="sku" value={form.sku} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl" placeholder="SKU" required={true}/>
        <input name='vendorSku' value={form.vendorSku} onChange={handleChange} placeholder='Vendor SKU' className='bg-white p-3 rounded shadow-xl'/>
        <input name='upc' value={form.upc} onChange={handleChange} placeholder='UPC' className='bg-white p-3 rounded shadow-xl' required/>
      </div>
      <label className="text-center font-bold">Product Brand & Name</label>
      <div className='grid lg:grid-cols-2 gap-3 mt-5 mb-5'>
        <div className="shadow-xl rounded bg-white">
        <select name='brand' value={form.brand} onChange={handleChange} className='p-3 rounded w-full h-full cursor-pointer' required>
          <option value='1' className='text-gray-300'>Select Brand</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        </div>
        <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded shadow-xl' required/>
      </div>
      <label className="text-center font-bold">Product Cost & Price</label>
      <div className='grid grid-cols-2 gap-3 mt-5'>
        <input name='unitCost' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitCost} onChange={handleChange} placeholder='Unit Cost' className='bg-white p-3 rounded shadow-xl'/>
        <input name='unitPrice' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitPrice} onChange={handleChange} placeholder='Unit Price' className='bg-white p-3 rounded shadow-xl'/>
      </div>
      </div>
    );
  }
  