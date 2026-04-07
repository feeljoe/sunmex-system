"use client";
import { useState } from 'react';

export default function AddChainForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/chains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <input className='border p-2 rounded w-full' placeholder='Chain Name' value={name} onChange={e => setName(e.target.value)} />
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Chain</button>
    </form>
  );
}
