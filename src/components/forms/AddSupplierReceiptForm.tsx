"use client";

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

// AddSupplierReceiptForm
export function AddSupplierReceiptForm({ onSuccess }: { onSuccess?: () => void }) {
  const suppliers = useFetch<{ _id: string; name: string }>("/api/suppliers");
  const products = useFetch<{ _id: string; name: string }>("/api/products");
  const users = useFetch<{ _id: string; firstName: string; lastName: string }>("/api/users");

  const [form, setForm] = useState({
    billNumber: '', PONumber: '', supplier: '', total: '', dateOfRequest: '', dateArrived: '',
    elaboratedBy: '', status: 'on_the_way',
    productsOrdered: [] as { productId: string; quantity: string; unit: 'units'|'cases'|'layers'|'pallets' }[]
  });

  const handleChange = (e: any) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const addPO = () => setForm(p => ({ ...p, productsOrdered: [...p.productsOrdered, { productId: '', quantity: '', unit: 'units' }] }));
  const removePO = (i: number) => setForm(p => ({ ...p, productsOrdered: p.productsOrdered.filter((_, idx) => idx !== i) }));
  const updatePO = (i: number, key: 'productId' | 'quantity' | 'unit', val: string) => setForm(p => ({ ...p, productsOrdered: p.productsOrdered.map((it, idx) => idx === i ? { ...it, [key]: val as any } : it) }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = {
      billNumber: form.billNumber || undefined,
      PONumber: form.PONumber || undefined,
      supplier: form.supplier,
      total: form.total ? Number(form.total) : undefined,
      dateOfRequest: form.dateOfRequest ? new Date(form.dateOfRequest).toISOString() : undefined,
      dateArrived: form.dateArrived ? new Date(form.dateArrived).toISOString() : undefined,
      elaboratedBy: form.elaboratedBy || undefined,
      status: form.status || undefined,
      productsOrdered: form.productsOrdered.map(p => ({ productId: p.productId, quantity: Number(p.quantity || 0), unit: p.unit }))
    };
    const res = await fetch('/api/supplierReceipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-3'>
        <input className='border p-2 rounded' name='billNumber' placeholder='Bill Number' value={form.billNumber} onChange={handleChange} />
        <input className='border p-2 rounded' name='PONumber' placeholder='PO Number' value={form.PONumber} onChange={handleChange} />
        <select className='border p-2 rounded' name='supplier' value={form.supplier} onChange={handleChange}>
          <option value=''>Select Supplier</option>
          {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input className='border p-2 rounded' name='total' type='number' placeholder='Total' value={form.total} onChange={handleChange} />
        <input className='border p-2 rounded' type='date' name='dateOfRequest' value={form.dateOfRequest} onChange={handleChange} />
        <input className='border p-2 rounded' type='date' name='dateArrived' value={form.dateArrived} onChange={handleChange} />
        <select className='border p-2 rounded' name='elaboratedBy' value={form.elaboratedBy} onChange={handleChange}>
          <option value=''>Elaborated By (optional)</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <input className='border p-2 rounded' name='status' placeholder='Status' value={form.status} onChange={handleChange} />
      </div>

      <div>
        <div className='flex items-center justify-between'>
          <label className='font-semibold'>Products Ordered</label>
          <button type='button' className='text-blue-600' onClick={addPO}>+ Add</button>
        </div>
        {form.productsOrdered.map((po, i) => (
          <div key={i} className='grid grid-cols-4 gap-3 mt-2'>
            <select className='border p-2 rounded' value={po.productId} onChange={e => updatePO(i, 'productId', e.target.value)}>
              <option value=''>Select Product</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <input className='border p-2 rounded' type='number' placeholder='Quantity' value={po.quantity} onChange={e => updatePO(i, 'quantity', e.target.value)} />
            <select className='border p-2 rounded' value={po.unit} onChange={e => updatePO(i, 'unit', e.target.value)}>
              <option value='units'>units</option>
              <option value='cases'>cases</option>
              <option value='layers'>layers</option>
              <option value='pallets'>pallets</option>
            </select>
            <button type='button' className='text-red-600' onClick={() => removePO(i)}>Remove</button>
          </div>
        ))}
      </div>

      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Supplier Receipt</button>
    </form>
  );
}
