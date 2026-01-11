import { useList } from "@/utils/useList";
import React, { useEffect, useState } from "react";

// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    const [checked, setChecked] = useState(false);
    
    const {
      items: chains,
      loading: chainsLoading,
    } = useList("/api/chains");
    
    const {
      items: paymentTerms,
      loading: paymentTermsLoading,
    } = useList("/api/paymentTerms");

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      ) {
        const { name, value } = e.target;
      
        // 👇 Handle relational selects
        if (name === "chain") {
          const selectedChain = chains.find(c => c._id === value) || null;
          setForm((prev: any) => ({
            ...prev,
            chain: selectedChain,
          }));
          return;
        }
      
        if (name === "paymentTerm") {
          const selectedTerm = paymentTerms.find(pt => pt._id === value) || null;
          setForm((prev: any) => ({
            ...prev,
            paymentTerm: selectedTerm,
          }));
          return;
        }
      
        // 👇 Default behavior (inputs, numbers, etc.)
        setForm((prev: any) => ({
          ...prev,
          [name]: value,
        }));
      }
      
      function handleCheckChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setChecked(checked);
      
        if (!checked) {
          setForm((prev: any) => ({
            ...prev,
            chain: null,
          }));
        }
      }
      
    return (
      <div className="mb-10 text-center">
        <label className="font-bold">Client Info</label>
        <div className='grid lg:grid-cols-2 items-center gap-3 pt-5'>
            <input name="clientNumber" value={form.clientNumber} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="Client Number" required={true}/>
            <input name='clientName' value={form.clientName} onChange={handleChange} placeholder='Client Name' className='bg-white p-3 rounded shadow-xl text-gray-700 h-15'/>
            <select name='chain' value={form.chain?._id || ""} onChange={handleChange} className='p-3 rounded w-full h-15 cursor-pointer mt-5 bg-white text-gray-400 shadow-xl' disabled={chainsLoading} required>
            <option value='1' className='text-gray-700'>{chainsLoading? "Loading chains..." : "SELECT CHAIN"}</option>
            {chains.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
        </div>
        <div className="grid lg:grid-cols-2 gap-3 pt-10">
            <select
                    name='paymentTerm'
                    value={form.paymentTerm?._id || ""}
                    onChange={handleChange}
                    className='p-2 rounded w-full h-15 bg-white text-gray-400 shadow-xl'
                >
                    <option value='' className="text-gray-700">{paymentTermsLoading? "Loading payment terms" : "SELECT PAYMENT TERM"}</option>
                    {paymentTerms.map(pt => (
                        <option key={pt._id} value={pt._id}>{pt.name}</option>
                    ))}
            </select>
            <input
                    name='creditLimit'
                    type='number'
                    inputMode="numeric"
                    placeholder='Credit Limit'
                    value={form.creditLimit}
                    onChange={handleChange}
                    className='p-2 rounded w-full h-15 bg-white text-gray-700 shadow-xl'
                    min={0}
                />
        </div>
      </div>
    );
  }