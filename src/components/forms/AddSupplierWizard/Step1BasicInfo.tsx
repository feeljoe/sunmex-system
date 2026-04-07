// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    
      function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
      } 
    return (
      <div className="mb-10">
        <div className='grid grid-cols gap-3 pt-10'>
            <label htmlFor="name" className="text-center font-bold">Supplier's Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="Supplier Name" required={true}/>
            <label htmlFor="contact" className="text-center font-bold">Contact Name</label>
            <input name='contact' value={form.contact} onChange={handleChange} placeholder='Contact Name' className='bg-white p-3 rounded shadow-xl text-gray-700 h-15'/>
            <label htmlFor="email" className="text-center font-bold">e-mail</label>
            <input
                    name='email'
                    type='email'
                    placeholder='e-mail'
                    value={form.email}
                    onChange={handleChange}
                    className='p-2 rounded w-full h-15 bg-white text-gray-700 shadow-xl'
                    min={0}
                />
                <label htmlFor="phoneNumber" className="text-center font-bold">Phone Number</label>
                <input
                    name='phoneNumber'
                    placeholder='Phone Number'
                    type="tel"
                    inputMode="numeric"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    className='p-2 rounded w-full h-15 bg-white text-gray-700 shadow-xl'
                />
        </div>
      </div>
    );
  }