// Step2Packaging.tsx
export function Step2Packaging({ form, setForm }: any) {
  const units = ["g" , "kg" , "mg" , "oz" , "lb" , "fl oz" , "ml" , "l"];
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
            const { name, value } = e.target;
            setForm((prev: any) => ({ ...prev, [name]: value }));
          } 
    return (
      <div className="">
        <div className='grid lg:grid-cols-3 gap-3 mt-5 mb-5'>
            <input name='productType' value={form.productType} onChange={handleChange} placeholder='Type' className='bg-white p-3 rounded shadow-xl'/>
            <input name='productFamily' value={form.productFamily} onChange={handleChange} placeholder='Family' className='bg-white p-3 rounded shadow-xl'/>
            <input name='productLine' value={form.productLine} onChange={handleChange} placeholder='Line' className='bg-white p-3 rounded shadow-xl'/>
        </div>
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5 mt-5'>
            <input name='caseSize' type='number' inputMode="numeric" value={form.caseSize} onChange={handleChange} placeholder='Case Size' className='bg-white p-3 rounded shadow-xl'/>
            <input name='layerSize' type='number' inputMode="numeric" value={form.layerSize} onChange={handleChange} placeholder='Layer Size' className='bg-white p-3 rounded shadow-xl'/>
            <input name='palletSize' type='number' inputMode="numeric" value={form.palletSize} onChange={handleChange} placeholder='Pallet Size' className='bg-white p-3 rounded shadow-xl'/>
            <input name='weight' type='number' inputMode="numeric" value={form.weight} onChange={handleChange} placeholder='Weight' className='bg-white p-3 rounded shadow-xl'/>
            <select name='unit' value={form.unit} onChange={handleChange} className='bg-white p-3 rounded shadow-xl'>
              <option value="">Select One</option>
              {units.map((u:string) => (
                <option key={u} value={u}>{u}</option>
              ))
              }
            </select>
        </div>  
      </div>
    );
  }
  