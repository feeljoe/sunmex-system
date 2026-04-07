export function StepInfo({ form, setForm }: any) {
  
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
  } 
  return (
    <div className="h-full bg-white p-4 rounded-lg shadow-xl">
      <input name='name' value={form.name} onChange={handleChange} placeholder='Name' className='bg-white p-3 rounded w-full h-full text-xl' required/>
    </div>
  );
}