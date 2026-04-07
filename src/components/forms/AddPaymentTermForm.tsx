"use client";
import { useState } from 'react';

export default function AddPaymentTermForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [dueOnReceipt, setDueOnReceipt] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = { name };
    if (days) payload.days = Number(days);
    if (dueOnReceipt) payload.dueOnReceipt = true;
    const res = await fetch('/api/paymentTerms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <input className='border p-2 rounded w-full' placeholder='Name' value={name} onChange={e => setName(e.target.value)} />
      <input className='border p-2 rounded w-full' placeholder='Days' type='number' min={0} value={days} onChange={e => setDays(e.target.value)} />
      <label className='flex items-center gap-2'>
        <input type='checkbox' checked={dueOnReceipt} onChange={e => setDueOnReceipt(e.target.checked)} /> Due on receipt
      </label>
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Payment Term</button>
    </form>
  );
}
