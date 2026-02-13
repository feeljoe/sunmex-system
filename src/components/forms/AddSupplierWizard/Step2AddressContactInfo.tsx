export function Step2AddressContactInfo({ form, setForm }: any) {
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
            const { name, value } = e.target;
            setForm((prev: any) => ({ ...prev, [name]: value }));
          } 
    return (
      <div className="mb-10">
        <div className='grid grid-cols-1 gap-3 pt-5'>
            <input name='addressLine' value={form.addressLine} onChange={handleChange} placeholder='Address Line' className='bg-white p-3 rounded shadow-xl h-15 text-gray-500'/>
        </div>
        <div className="grid lg:grid-cols-2 gap-3 pt-10">   
            <input name='city' value={form.city} onChange={handleChange} placeholder='City' className='bg-white p-3 rounded shadow-xl h-15 text-gray-500'/>
            <select name='state' value={form.state} onChange={handleChange} className='p-3 rounded w-full h-15 cursor-pointer bg-white text-gray-500' required>
                <option value='1' className='text-gray-300'>Select State</option>
                <option value="AZ" className="text-gray-300">AZ (Arizona)</option>
                <option value="TX" className="text-gray-300">TX (Texas)</option>
            </select>
            <select name='country' value={form.country} onChange={handleChange} className='p-3 rounded w-full h-15 cursor-pointer bg-white text-gray-500' required>
                <option value='1' className='text-gray-300'>Select Country</option>
                <option value="USA" className="text-gray-300">USA</option>
            </select>
            <input name='zipCode' inputMode="numeric" value={form.zipCode} onChange={handleChange} placeholder='Zip Code' className='bg-white p-3 rounded shadow-xl h-15 text-gray-500'/>
        </div>
      </div>
    );
  }
  