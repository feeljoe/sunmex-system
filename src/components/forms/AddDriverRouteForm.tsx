import { useEffect, useState } from 'react';

// Utility hooks
function useFetch<T = any>(url: string) {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);
        if (res.ok) setData(await res.json());
      } catch {}
    })();
  }, [url]);
  return data;
}

// AddDriverRouteForm
export function AddDriverRouteForm({ onSuccess }: { onSuccess?: () => void }) {
  const users = useFetch<{ _id: string; firstName: string; lastName: string }>("/api/users");
  const receipts = useFetch<{ _id: string; invoiceNumber: string }>("/api/clientReceipts");
  const [form, setForm] = useState({ user: '', clientReceipts: [] as string[] });
  const handleChange = (e: any) => {
    const { name, options, multiple, value } = e.target;
    if (multiple) {
      const vals = Array.from(options).filter((o: any) => o.selected).map((o: any) => o.value);
      setForm(p => ({ ...p, [name]: vals }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/driverRoutes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) onSuccess?.();
  };
  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-3'>
        <select className='border p-2 rounded' name='user' value={form.user} onChange={handleChange}>
          <option value=''>Select Driver (User)</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <select className='border p-2 rounded h-32' name='clientReceipts' multiple value={form.clientReceipts} onChange={handleChange}>
          {receipts.map(r => <option key={r._id} value={r._id}>{r.invoiceNumber}</option>)}
        </select>
      </div>
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Driver Route</button>
    </form>
  );
}