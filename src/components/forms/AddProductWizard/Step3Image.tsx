// Step3Image.tsx
export function Step3Image({ form, setForm }: any) {
    
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if(file) {
          setForm((prev: any) =>({...prev, imageFile: file, imageUrl: URL.createObjectURL(file) }));
        }
      }

    function removeImage(e?: React.MouseEvent){
        e?.stopPropagation();
        setForm((prev: any) => ({ ...prev, imageFile: null, imageUrl: null }));
      }

    return (
      <div className="h-100">
        <div className='flex flex-col pt-5 items-center'>
        <label className='text-gray-700 text-2xl mb-5'>Select Product Image</label>
        <div className='relative w-50 h-60 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-300 transition' onClick={() => document.getElementById("productImageInput")?.click()}>
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt="Preview"
              className='w-full h-full object-cover rounded-t-2xl'
            />
          ) : (
            <div className='text-gray-300 text-m  hover:text-blue-300'>Click to Upload</div>
          )}
        </div>
        {form.imageUrl && (
            <button
              type="button"
              onClick={removeImage}
              className="bg-red-600 text-white rounded-b-lg w-49 h-10 flex items-center justify-center text-4xl hover:bg-red-700 cursor-pointer"
            >
              &times;
            </button>
          )}
        <input id='productImageInput' type='file' accept='image/*' className='hidden' onChange={handleFileChange}/>
        <p className='text-sm text-red-500 mt-2'> PNG, JPG, GIF up to 10MB.</p>
      </div>
      </div>
    );
  }
  