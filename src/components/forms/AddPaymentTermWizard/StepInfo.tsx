import { useState } from 'react';
export function StepInfo({ form, setForm }: any) {
    const [dueOnReceipt, setDueOnReceipt] = useState(false);
  
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
  } 

  function toggleDueOnReceipt(e: React.ChangeEvent<HTMLInputElement>){
    setDueOnReceipt(e.target.checked);
  }
  return (
    <div className="grid lg:grid-cols-2 gap-4 rounded-lg">
      <label className='shadow-xl flex items-center justify-start h-12 gap-2 text-gray-500 bg-white rounded'>
        <input type='checkbox' checked={dueOnReceipt} onChange={toggleDueOnReceipt} className='h-8 w-8'/> Due on receipt
      </label>
      <input name="name" className='shadow-xl p-2 rounded w-full h-12 text-gray-500 bg-white' placeholder='Name' value={form.name} onChange={handleChange} />
      { !dueOnReceipt &&
        <input name="days" className='shadow-xl p-2 h-12 rounded w-full text-gray-500 bg-white' placeholder='Days' type="Number" min={0} value={form.days} onChange={handleChange} />
      }
    </div>
  );
}