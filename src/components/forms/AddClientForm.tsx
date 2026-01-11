"use client";

import { useEffect, useState } from 'react';

export default function AddClientForm({ onSuccess }: { onSuccess?: ()=> void }) {
    const [form, setForm] = useState({
        clientNumber: "",
        clientName: "",
        isChain: false,
        chain: "",
        contactName: "",
        phoneNumber: "",
        // address fields separated in UI, merged on submit
        addressLine: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        paymentTerm: "",
        creditLimit: "",
        visitingDays: [] as string[],
    });

    const [chains, setChains] = useState<{ _id: string; name: string }[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<{ _id: string; name: string }[]>([]);
    const [visitingDaysOptions, setVisitingDaysOptions] = useState<{ _id: string; visitingDay: string }[]>([]);

    useEffect(() => {
        // Load options for selects
        const loadOptions = async () => {
            try {
                const [chainsRes, termsRes, visitingRes] = await Promise.all([
                    fetch('/api/clients/chains'),
                    fetch('/api/clients/payment-terms'),
                    fetch('/api/clients/visiting-days'),
                ]);
                if (chainsRes.ok) setChains(await chainsRes.json());
                if (termsRes.ok) setPaymentTerms(await termsRes.json());
                if (visitingRes.ok) setVisitingDaysOptions(await visitingRes.json());
            } catch (e) {
                // ignore for now; UI will just show empty options
            }
        };
        loadOptions();
    }, []);

    const handleChange = (e: any) => {
        const { name, value, type, checked, multiple, options } = e.target;
        if (type === 'checkbox') {
            setForm(prev => ({ ...prev, [name]: checked }));
        } else if (multiple) {
            const selected: string[] = Array.from(options)
                .filter((o: any) => o.selected)
                .map((o: any) => o.value);
            setForm(prev => ({ ...prev, [name]: selected }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e:any) => {
        e.preventDefault();

        const payload = {
            clientNumber: form.clientNumber,
            clientName: form.clientName,
            isChain: form.isChain,
            chain: form.chain || undefined,
            contactName: form.contactName || undefined,
            phoneNumber: form.phoneNumber || undefined,
            billingAddress: {
                addressLine: form.addressLine || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                country: form.country || undefined,
                zipCode: form.zipCode || undefined,
            },
            paymentTerm: form.paymentTerm || undefined,
            creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
            visitingDays: form.visitingDays && form.visitingDays.length ? form.visitingDays : undefined,
        };

        const res  = await fetch("/api/clients", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if(res.ok && onSuccess) onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
            <div className='grid grid-cols-2 gap-4'>
                <input
                    name="clientNumber"
                    placeholder='Client Number'
                    value={form.clientNumber}
                    onChange={handleChange}
                    className='border p-2 rounded'
                />
                <input
                    name="clientName"
                    placeholder='Client Name'
                    value={form.clientName}
                    onChange={handleChange}
                    className='border p-2 rounded'
                />
            </div>

            <div className='flex items-center gap-2'>
                <label htmlFor='isChain'>Is Chain?</label>
                <input 
                    id='isChain'
                    name= "isChain"
                    checked={form.isChain}
                    onChange={handleChange}
                    type="checkbox"
                    className='border p-2 rounded' 
                />
            </div>

            <div>
                <label className='block mb-1'>Chain</label>
                <select
                    name='chain'
                    value={form.chain}
                    onChange={handleChange}
                    className='border p-2 rounded w-full'
                    disabled={!form.isChain}
                >
                    <option value="">SELECT ONE</option>
                    {chains.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
            </div>
            
            <input
                name='contactName'
                placeholder='Contact Name'
                value={form.contactName}
                onChange={handleChange}
                className='border p-2 rounded w-full'
            />
            <input
                name='phoneNumber'
                placeholder='Phone Number'
                value={form.phoneNumber}
                onChange={handleChange}
                className='border p-2 rounded w-full'
            />

            <div>
                <label className='block font-semibold mb-1'>Billing Address</label>
                <div className='grid grid-cols-2 gap-4'>
                    <input name='addressLine' placeholder='Address Line' value={form.addressLine} onChange={handleChange} className='border p-2 rounded w-full' />
                    <input name='city' placeholder='City' value={form.city} onChange={handleChange} className='border p-2 rounded w-full' />
                    <input name='state' placeholder='State' value={form.state} onChange={handleChange} className='border p-2 rounded w-full' />
                    <input name='country' placeholder='Country' value={form.country} onChange={handleChange} className='border p-2 rounded w-full' />
                    <input name='zipCode' placeholder='Zip Code' value={form.zipCode} onChange={handleChange} className='border p-2 rounded w-full' />
                </div>
            </div>

            <div>
                <label className='block mb-1'>Payment Term</label>
                <select
                    name='paymentTerm'
                    value={form.paymentTerm}
                    onChange={handleChange}
                    className='border p-2 rounded w-full'
                >
                    <option value=''>SELECT ONE</option>
                    {paymentTerms.map(pt => (
                        <option key={pt._id} value={pt._id}>{pt.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className='block mb-1'>Credit Limit</label>
                <input
                    name='creditLimit'
                    type='number'
                    placeholder='Credit Limit'
                    value={form.creditLimit}
                    onChange={handleChange}
                    className='border p-2 rounded w-full'
                    min={0}
                />
            </div>

            <div>
                <label className='block mb-1'>Visiting Days</label>
                <select
                    name='visitingDays'
                    multiple
                    value={form.visitingDays}
                    onChange={handleChange}
                    className='border p-2 rounded w-full h-32'
                >
                    {visitingDaysOptions.map(v => (
                        <option key={v._id} value={v._id}>{v.visitingDay}</option>
                    ))}
                </select>
                <p className='text-sm text-gray-500 mt-1'>Hold Ctrl/Cmd to select multiple.</p>
            </div>
            
            <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>
                Save Client
            </button>    
        </form>
    );
}