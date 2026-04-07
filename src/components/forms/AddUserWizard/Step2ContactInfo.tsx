export function Step2ContactInfo({ form, setForm }: any) {
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
            const { name, value } = e.target;
            setForm((prev: any) => ({ ...prev, [name]: value }));
          } 
    return (
      <div className="mb-10">
        <div className="grid lg:grid-cols-2 gap-3 pt-5">   
            <input name='email' type="email" value={form.email} onChange={handleChange} placeholder='e-mail' className='bg-white p-3 rounded shadow-xl h-15 text-gray-500'/>
            
            <input name='phoneNumber' inputMode="numeric" type="phone" value={form.phoneNumber} onChange={handleChange} placeholder='Phone Number' className='bg-white p-3 rounded shadow-xl h-15 text-gray-500'/>
        </div>
      </div>
    );
  }
  