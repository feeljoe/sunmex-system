"use client";

import { useState, useEffect} from 'react';

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

// AddUserForm
export function AddUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    userRole: 'vendor',
    username: '',
    password: '',
    route: '' as string | ''
  });
  const routes = useFetch<{ _id: string; routeNumber: string }>("/api/routes");

  const handleChange = (e: any) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.route) delete payload.route;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3 bg-white p-6 rounded-lg shadow'>
      <div className='grid grid-cols-2 gap-3'>
        <input className='border p-2 rounded' name='firstName' placeholder='First Name' value={form.firstName} onChange={handleChange} />
        <input className='border p-2 rounded' name='lastName' placeholder='Last Name' value={form.lastName} onChange={handleChange} />
        <select className='border p-2 rounded' name='userRole' value={form.userRole} onChange={handleChange}>
          <option value='admin'>admin</option>
          <option value='vendor'>vendor</option>
          <option value='driver'>driver</option>
          <option value='warehouse'>warehouse</option>
          <option value='owner'>owner</option>
        </select>
        <input className='border p-2 rounded' name='username' placeholder='Username' value={form.username} onChange={handleChange} />
        <input className='border p-2 rounded' type='password' name='password' placeholder='Password' value={form.password} onChange={handleChange} />
        <select className='border p-2 rounded' name='route' value={form.route} onChange={handleChange}>
          <option value=''>No route</option>
          {routes.map(r => <option key={r._id} value={r._id}>{r.routeNumber}</option>)}
        </select>
      </div>
      <button className='bg-blue-600 text-white px-4 py-2 rounded shadow'>Save User</button>
    </form>
  );
}