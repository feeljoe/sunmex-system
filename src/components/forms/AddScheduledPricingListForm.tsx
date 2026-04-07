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

// AddScheduledPricingListForm
export function AddScheduledPricingListForm({ onSuccess }: { onSuccess?: () => void }) {
  const brands = useFetch<{ _id: string; name: string }>("/api/brands");
  const products = useFetch<{ _id: string; name: string }>("/api/products");
  const clients = useFetch<{ _id: string; clientName: string }>("/api/clients");

  const [form, setForm] = useState({
    name: '',
    brandIds: [] as string[],
    productIds: [] as string[],
    clientsAssigned: [] as string[],
    pricing: [] as { productId?: string; brandId?: string; price: string }[],
    startDate: '',
    endDate: '',
  });

  const handleChange = (e: any) => {
    const { name, options, multiple, value } = e.target;
    if (multiple) {
      const vals = Array.from(options).filter((o: any) => o.selected).map((o: any) => o.value);
      setForm(p => ({ ...p, [name]: vals }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const addPricing = () => setForm(p => ({ ...p, pricing: [...p.pricing, { productId: undefined, brandId: undefined, price: '' }] }));
  const removePricing = (i: number) => setForm(p => ({ ...p, pricing: p.pricing.filter((_, idx) => idx !== i) }));
  const updatePricing = (i: number, key: 'productId' | 'brandId' | 'price', val: string) => setForm(p => ({ ...p, pricing: p.pricing.map((it, idx) => idx === i ? { ...it, [key]: val } : it) }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      brandIds: form.brandIds,
      productIds: form.productIds,
      clientsAssigned: form.clientsAssigned,
      pricing: form.pricing.map(pr => ({ productId: pr.productId || undefined, brandId: pr.brandId || undefined, price: Number(pr.price || 0) })),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };
    const res = await fetch('/api/scheduledPricingLists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <input className='border p-2 rounded w-full' name='name' placeholder='Name' value={form.name} onChange={handleChange} />
      <div className='grid grid-cols-3 gap-3'>
        <select className='border p-2 rounded h-32' name='brandIds' multiple value={form.brandIds} onChange={handleChange}>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className='border p-2 rounded h-32' name='productIds' multiple value={form.productIds} onChange={handleChange}>
          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className='border p-2 rounded h-32' name='clientsAssigned' multiple value={form.clientsAssigned} onChange={handleChange}>
          {clients.map(c => <option key={c._id} value={c._id}>{c.clientName}</option>)}
        </select>
      </div>

      <div>
        <div className='flex items-center justify-between'>
          <label className='font-semibold'>Pricing Entries</label>
          <button type='button' className='text-blue-600' onClick={addPricing}>+ Add Entry</button>
        </div>
        {form.pricing.map((pr, i) => (
          <div key={i} className='grid grid-cols-4 gap-3 mt-2'>
            <select className='border p-2 rounded' value={pr.productId || ''} onChange={e => updatePricing(i, 'productId', e.target.value)}>
              <option value=''>Product (optional)</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select className='border p-2 rounded' value={pr.brandId || ''} onChange={e => updatePricing(i, 'brandId', e.target.value)}>
              <option value=''>Brand (optional)</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <input className='border p-2 rounded' placeholder='Price' type='number' value={pr.price} onChange={e => updatePricing(i, 'price', e.target.value)} />
            <button type='button' className='text-red-600' onClick={() => removePricing(i)}>Remove</button>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label className='block text-sm text-gray-600'>Start Date</label>
          <input className='border p-2 rounded w-full' type='date' name='startDate' value={form.startDate} onChange={handleChange} />
        </div>
        <div>
          <label className='block text-sm text-gray-600'>End Date</label>
          <input className='border p-2 rounded w-full' type='date' name='endDate' value={form.endDate} onChange={handleChange} />
        </div>
      </div>

      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Scheduled Pricing List</button>
    </form>
  );
}
