import { useList } from "@/utils/useList";
import React, { useState } from "react";

// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
  const [brandSearch, setBrandSearch] = useState("");
  // We keep selectedBrand just to track the underlying object if needed, 
  // but brandSearch now handles the UI display.
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  const { items: brands } = useList('/api/brands', {
    search: brandSearch,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  }

  function fixName(name: string) {
    if (!name) return "";
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function calculateMargin(revenue: string, cost: string) {
    if (revenue === "" || cost === "") return 0;
    return (((Number(revenue) - Number(cost)) / Number(revenue)) * 100).toFixed(2);
  }

  return (
    <div className="flex flex-col mb-10">
      <label className="text-center font-bold">Product Info</label>
      <div className='grid lg:grid-cols-3 gap-3 mt-5 mb-5'>
        <input name="sku" value={form.sku} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl" placeholder="SKU" required={true} />
        <input name='vendorSku' value={form.vendorSku} onChange={handleChange} placeholder='Vendor SKU' className='bg-white p-3 rounded shadow-xl' />
        <input name='upc' value={form.upc} onChange={handleChange} placeholder='UPC' className='bg-white p-3 rounded shadow-xl' required />
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
              // If user starts typing again, we clear the specific brand ID from the form
              if (selectedBrand) setSelectedBrand(null);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full h-full p-3 rounded"
          />
          
          {/* Optional: Clear button inside the input */}
          {brandSearch && (
            <button 
              onClick={() => {
                setBrandSearch("");
                setSelectedBrand(null);
                setForm((prev: any) => ({ ...prev, brand: "" }));
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}

          {showResults && brands?.length > 0 && (
            <ul className="absolute border border-gray-100 z-10 w-full bg-white rounded shadow-2xl mt-1 max-h-60 overflow-auto">
              {brands.map((b) => (
                <li
                  key={b._id}
                  onClick={() => {
                    const formattedName = fixName(b.name);
                    setSelectedBrand(b);
                    setBrandSearch(formattedName); // Put the name in the input
                    setForm((prev: any) => ({
                      ...prev,
                      brand: b._id,
                    }));
                    setShowResults(false);
                  }}
                  className="p-3 cursor-pointer hover:bg-blue-50 border-b last:border-0"
                >
                  {fixName(b.name)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded shadow-xl' required />
      </div>

      <label className="text-center font-bold">Product Cost & Price</label>
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5'>
        <input name='unitCost' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitCost} onChange={handleChange} placeholder='Unit Cost' className='bg-white p-3 rounded shadow-xl' />
        <input name='unitPrice' type='number' inputMode="decimal" step={0.01} min={0} value={form.unitPrice} onChange={handleChange} placeholder='Unit Price' className='bg-white p-3 rounded shadow-xl' />
        <label className='bg-white p-3 rounded shadow-xl text-center'> 
          <span className="font-bold">Margin:</span> {calculateMargin(form.unitPrice, form.unitCost)}% 
        </label>
      </div>
    </div>
  );
}