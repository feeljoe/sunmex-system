import { useList } from "@/utils/useList";
import React, { useEffect, useState } from "react";

// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    const [brandSearch, setBrandSearch] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);
    const { items:brands } = useList('/api/brands', {
      search: brandSearch,
    });
    
      function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
      } 
      function fixName(name: string){
        return name
          .split(" ")
          .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
      }
      function calculateMargin(revenue: string, cost: string){
        if(revenue === "" || cost === "") return 0;
        return (((Number(revenue) - Number(cost))/Number(revenue)) * 100).toFixed(2)
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
        <div className="relative w-full h-12 shadow-xl rounded bg-white">
          <input 
            type="text"
            placeholder="Search Brand..."
            value={brandSearch}
            onChange={(e) => {
              setBrandSearch(e.target.value);
              setShowResults(true);
            }}
            className="w-full h-full p-3" 
          />
          {showResults && brands?.length > 0 && (
            <ul className="absolute z-10 w-full bg-white rounded shadow-xl mt-2 max-h-60 overflow-auto">
              {brands.map((b) => (
                <li
                  key={b._id}
                  onClick={() => {
                    setSelectedBrand(b);
                    setForm((prev: any) => ({
                      ...prev,
                      brand: b._id,
                    }));
                    setBrandSearch("");
                    setShowResults(false);
                  }}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                >
                  {fixName(b.name)}
                </li>
              ))}
            </ul>
          )}
          {selectedBrand && (
            <div className="flex flex-wrap gap-2 mt-2 p-2">
              <span
                className="bg-blue-100 text-blue-500 px-3 py-1 shadow-xl rounded-full flex items-center gap-2"
              >
                {fixName(selectedBrand.name)}
                <button
                onClick={() => setSelectedBrand(null)}
                className="cursor-pointer">
                ✕
              </button>
              </span>
            </div>
          )}
        </div>
        <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded shadow-xl' required/>
      </div>
      <label className="text-center font-bold">Product Cost & Price</label>
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5'>
        <input name='unitCost' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitCost} onChange={handleChange} placeholder='Unit Cost' className='bg-white p-3 rounded shadow-xl'/>
        <input name='unitPrice' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitPrice} onChange={handleChange} placeholder='Unit Price' className='bg-white p-3 rounded shadow-xl'/>
        <label className='bg-white p-3 rounded shadow-xl text-center'> <span className="font-bold">Margin:</span> {calculateMargin(form.unitPrice, form.unitCost)}% </label>
      </div>
      </div>
    );
  }
  