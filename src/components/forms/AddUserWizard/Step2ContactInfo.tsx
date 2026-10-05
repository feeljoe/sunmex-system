export function Step2ContactInfo({ form, setForm }: any) {
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
            const { name, value } = e.target;
            setForm((prev: any) => ({ ...prev, [name]: value }));
          } 
    return (
      <div className="mb-10">
        <div className="grid lg:grid-cols-2 gap-3 pt-5">   
          <div className="grid">
            <label className="text-lg font-bold mb-2">Email:</label>
            <input name='email' type="email" value={form.email} onChange={handleChange} placeholder='e-mail' className='bg-white p-3 rounded-xl shadow-xl h-15 text-gray-500'/>
          </div>
          <div className="grid">
            <label className="text-lg font-bold mb-2">Phone Number:</label>
            <input name='phoneNumber' inputMode="numeric" type="tel" value={form.phoneNumber} onChange={handleChange} placeholder='Phone Number' className='bg-white p-3 rounded-xl shadow-xl h-15 text-gray-500'/>
           </div> 
            <div className="grid">
            <label className="text-lg font-bold mb-2">Location:</label>
            <div className="w-full h-15 rounded-xl p-3 shadow-xl bg-white">
            <select name="location" value={form.location} onChange={handleChange} className="w-full h-full">
              <option value="">Select One</option>
              <option value="phoenix">Phoenix</option>
              <option value="yuma">Yuma</option>
              <option value="tucson">Tucson</option>
              <option value="elPaso">El Paso</option>
              <option value="lasVegas">Las Vegas</option>
            </select>
            </div>
            </div>
        </div>
      </div>
    );
  }
  