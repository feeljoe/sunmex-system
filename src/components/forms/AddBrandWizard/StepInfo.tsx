import { useState } from 'react';
export function StepInfo({ form, setForm }: any) {
  const [name, setName] = useState("");
  
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
  } 
  return (
    <div className="h-full bg-white p-4 rounded-xl shadow-xl">
      <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded-xl w-full h-full text-xl' required/>
    </div>
  );
}