// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    const userRole = ["admin", "vendor", "driver", "warehouse", "onRoute"];
      
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
    }

    return (
      <div className="mb-10">
        <div className='grid grid-cols gap-3 pt-5'>
          <label htmlFor="name" className="text-center font-bold">User's Name</label>
            <div className="grid lg:grid-cols-2 gap-4">
              <input name="firstName" value={form.firstName} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="First Name" required={true}/>
              <input name="lastName" value={form.lastName} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="Last Name" required={true}/>
            </div>
            <label htmlFor="userRole" className="text-center font-bold">User Role</label>
            <select name="userRole" value={form.userRole} onChange={handleChange} className="h-10 bg-white rounded-xl shadow-xl">
              <option value="">Select One</option>
              {userRole.map((ur) => (
                <option key={ur} value={ur}>{ur.toUpperCase()}</option>
              ))}
            </select>
            <label className="text-center font-bold">Login Info</label>
            <div className="grid lg:grid-cols-2 gap-4">
              <input name="username" value={form.username} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="Username" required={true}/>
              
              <input name="password" type="password" value={form.password} onChange={handleChange} className="peer bg-white p-3 rounded shadow-xl text-gray-700 h-15" placeholder="password" required={true}/>
            </div>
        </div>
      </div>
    );
  }