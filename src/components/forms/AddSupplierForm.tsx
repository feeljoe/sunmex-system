import { useState } from 'react';

// AddSupplierForm
export function AddSupplierForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState({
    name: '', contact: '', email: '', phoneNumber: '',
    addressLine: '', city: '', state: '', country: '', zipCode: ''
  });
  const handleChange = (e: any) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      contact: form.contact || undefined,
      email: form.email || undefined,
      phoneNumber: form.phoneNumber || undefined,
      billingAddress: {
        addressLine: form.addressLine || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        zipCode: form.zipCode || undefined,
      }
    };
    const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) onSuccess?.();
  };
  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-3'>
        <input className='border p-2 rounded' name='name' placeholder='Name' value={form.name} onChange={handleChange} />
        <input className='border p-2 rounded' name='contact' placeholder='Contact' value={form.contact} onChange={handleChange} />
        <input className='border p-2 rounded' name='email' placeholder='Email' value={form.email} onChange={handleChange} />
        <input className='border p-2 rounded' name='phoneNumber' placeholder='Phone Number' value={form.phoneNumber} onChange={handleChange} />
        <input className='border p-2 rounded' name='addressLine' placeholder='Address Line' value={form.addressLine} onChange={handleChange} />
        <input className='border p-2 rounded' name='city' placeholder='City' value={form.city} onChange={handleChange} />
        <input className='border p-2 rounded' name='state' placeholder='State' value={form.state} onChange={handleChange} />
        <input className='border p-2 rounded' name='country' placeholder='Country' value={form.country} onChange={handleChange} />
        <input className='border p-2 rounded' name='zipCode' placeholder='Zip Code' value={form.zipCode} onChange={handleChange} />
      </div>
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save Supplier</button>
    </form>
  );
}