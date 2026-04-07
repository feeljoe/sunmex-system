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

// AddClientReceiptForm
export function AddClientReceiptForm({ onSuccess }: { onSuccess?: () => void }) {
  const users = useFetch<{ _id: string; firstName: string; lastName: string }>("/api/users");
  const clients = useFetch<{ _id: string; clientName: string }>("/api/clients");
  const products = useFetch<{ _id: string; name: string }>("/api/products");
  const [form, setForm] = useState({
    invoiceNumber: '', date: '', user: '', client: '', total: '', status: 'pending',
    products: [] as { productId: string; quantity: string }[]
  });

  const handleChange = (e: any) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const addProduct = () => setForm(p => ({ ...p, products: [...p.products, { productId: '', quantity: '' }] }));
  const removeProduct = (i: number) => setForm(p => ({ ...p, products: p.products.filter((_, idx) => idx !== i) }));
  const updateProduct = (i: number, key: 'productId' | 'quantity', val: string) => setForm(p => ({ ...p, products: p.products.map((it, idx) => idx === i ? { ...it, [key]: val } : it) }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = {
      invoiceNumber: form.invoiceNumber,
      date: form.date ? new Date(form.date).toISOString() : undefined,
      user: form.user || undefined,
      client: form.client || undefined,
      total: form.total ? Number(form.total) : undefined,
      status: form.status || undefined,
      products: form.products.map(p => ({ productId: p.productId, quantity: Number(p.quantity || 0) }))
    };
    const res = await fetch('/api/clientReceipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-3'>
        <input className='border p-2 rounded' name='invoiceNumber' placeholder='Invoice Number' value={form.invoiceNumber} onChange={handleChange} />
        <input className='border p-2 rounded' type='date' name='date' value={form.date} onChange={handleChange} />
        <select className='border p-2 rounded' name='user' value={form.user} onChange={handleChange}>
          <option value=''>Select User</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <select className='border p-2 rounded' name='client' value={form.client} onChange={handleChange}>
          <option value=''>Select Client</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.clientName}</option>)}
        </select>
        <input className='border p-2 rounded' name='total' type='number' placeholder='Total' value={form.total} onChange={handleChange} />
        <select className='border p-2 rounded' name='status' value={form.status} onChange={handleChange}>
          <option value='pending'>pending</option>
          <option value='paid'>paid</option>
        </select>
      </div>

      <div>
        <div className='flex items-center justify-between'>
          <label className='font-semibold'>Products</label>
          <button type='button' className='text-blue-600' onClick={addProduct}>+ Add Product</button>
        </div>
        {form.products.map((p, i) => (
          <div key={i} className='grid grid-cols-3 gap-3 mt-2'>
            <select className='border p-2 rounded' value={p.productId} onChange={e => updateProduct(i, 'productId', e.target.value)}>
              <option value=''>Select Product</option>
              {products.map(pr => <option key={pr._id} value={pr._id}>{pr.name}</option>)}
            </select>
            <input className='border p-2 rounded' type='number' placeholder='Quantity' value={p.quantity} onChange={e => updateProduct(i, 'quantity', e.target.value)} />
            <button type='button' className='text-red-600' onClick={() => removeProduct(i)}>Remove</button>
          </div>
        ))}
      </div>

      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Client Receipt</button>
    </form>
  );
}