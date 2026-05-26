import { useList } from "@/utils/useList";
import React, { useState, useRef, useEffect } from "react";
// Step2Packaging.tsx
export function Step2Packaging({ form, setForm }: any) {
  const units = ["g" , "kg" , "mg" , "oz" , "lb" , "fl oz" , "ml" , "l"];
  
  const [typeSearch, setTypeSearch] = useState(form.productType || "");
  const [showResults, setShowResults] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const {items: types} = useList('/api/types', {
    search: typeSearch,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent){
      if(wrapperRef.current && !wrapperRef.current.contains(event.target as Node)){
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  } 

    return (
      <div className="flex flex-col mb-10">
        <div className="text-center mb-5">
          <label className="font-bold">Product Packaging</label>
        </div>
        <div className='grid lg:grid-cols-2 gap-4'>
          <div ref={wrapperRef} className="relative w-full h-12 shadow-xl rounded bg-white">
            <input 
              name="productType"
              type="text"
              placeholder="Type (e.g. Botana, Bebida)"
              value={typeSearch} 
              onChange={(e) => {
                setTypeSearch(e.target.value);
                setForm((prev: any) => ({ ...prev, productType: e.target.value}));
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className='bg-white w-full p-3 rounded'
            />
            {typeSearch && (
              <button 
                type="button"
                onClick={() => {
                  setTypeSearch("");
                  setForm((prev: any) => ({ ...prev, productType: "" }));
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}

            {showResults && types?.length > 0 && (
              <ul className="absolute z-20 w-full bg-white rounded shadow-2xl mt-1 max-h-60 overflow-auto border border-gray-100">
                {types.map((t: any) => (
                  <li
                    key={t._id}
                    onClick={() => {
                      setTypeSearch(t.name);
                      setForm((prev: any) => ({ ...prev, productType: t._id }));
                      setShowResults(false);
                    }}
                    className="p-3 cursor-pointer hover:bg-blue-50 border-b last:border-0"
                  >
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/*<input name='productFamily' value={form.productFamily} onChange={handleChange} placeholder='Family' className='bg-white p-3 rounded shadow-xl'/>
          <input name='productLine' value={form.productLine} onChange={handleChange} placeholder='Line' className='bg-white p-3 rounded shadow-xl'/>*/}
          <input name='caseSize' type='number' inputMode="numeric" value={form.caseSize} onChange={handleChange} placeholder='Case Size' className='bg-white p-3 rounded shadow-xl'/>
          {/*<input name='layerSize' type='number' inputMode="numeric" value={form.layerSize} onChange={handleChange} placeholder='Layer Size' className='bg-white p-3 rounded shadow-xl'/>
          <input name='palletSize' type='number' inputMode="numeric" value={form.palletSize} onChange={handleChange} placeholder='Pallet Size' className='bg-white p-3 rounded shadow-xl'/>*/}
          <input name='weight' type='number' inputMode="numeric" value={form.weight} onChange={handleChange} placeholder='Weight' className='bg-white p-3 rounded shadow-xl'/>
          <select name='unit' value={form.unit} onChange={handleChange} className='bg-white p-3 rounded shadow-xl h-12'>
            <option value="">Select One</option>
            {units.map((u:string) => (
              <option key={u} value={u}>{u}</option>
            ))
            }
          </select>
        </div>  
      </div>
    );
  }
  