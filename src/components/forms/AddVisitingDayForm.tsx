
import { useState } from 'react';

// AddVisitingDayForm
export function AddVisitingDayForm({ onSuccess }: { onSuccess?: () => void }) {
  const [visitingDay, setVisitingDay] = useState('');
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/visitingDays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitingDay }) });
    if (res.ok) onSuccess?.();
  };
  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <input className='border p-2 rounded w-full' placeholder='Visiting Day' value={visitingDay} onChange={e => setVisitingDay(e.target.value)} />
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Visiting Day</button>
    </form>
  );
}