import { useList } from "@/utils/useList";
import React, { useEffect, useState } from "react";

// Step1BasicInfo.tsx
export function Step1BasicInfo({ form, setForm }: any) {
    const [brandSearch, setBrandSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const isBrand = form.appliesTo === "brand";
    const {
          items: brands,
          loading: brandsLoading,
        } = useList("/api/brands", {
            search: brandSearch,
        });
        
        const {
          items: products,
          loading: productsLoading,
        } = useList("/api/products", {
            search: productSearch,
        });

      function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
        const { name, value } = e.target;
        setForm((prev: any) => ({ ...prev, [name]: value }));
      } 
      function toggleAppliesTo(e: React.ChangeEvent<HTMLInputElement>){
        setForm((prev: any) => ({
            ...prev,
            appliesTo: prev.appliesTo === "brand"? "product" : "brand",
            productIds: [],
            brandIds: [],
        }));
      }

      function addProduct(product: any) {
        setForm((prev: any) => {
          if (prev.products.some((p: any) => p._id === product._id)) return prev;
      
          return {
            ...prev,
            products: [
              ...prev.products,
              {
                _id: product._id,
                name: product.name,
                sku: product.sku,
              },
            ],
          };
        });
      
        setProductSearch("");
      }          
      
      function addBrand(brand: any) {
        setForm((prev: any) => {
          if (prev.brands.some((b: any) => b._id === brand._id)) return prev;
      
          return {
            ...prev,
            brands: [
              ...prev.brands,
              {
                _id: brand._id,
                name: brand.name,
              },
            ],
          };
        });
      
        setBrandSearch("");
      }
           

      function removeItem(id: string, type: "product" | "brand") {
        setForm((prev: any) => ({
            ...prev,
            [`${type}s`]: prev[`${type}s`].filter((pb: any) => pb._id !== id),
        }));
      }

    return (
      <div className="mb-10">
        <div className='grid grid-cols gap-3 pt-5'>
            <input name="name" value={form.name} onChange={handleChange} className="peer bg-white p-3 rounded-xl shadow-xl text-gray-700 h-15" placeholder="Pricing List Name" required={true}/>
            <label className="flex items-center justify-center w-full h-15 text-xl mt-5 gap-5">Applies to Brands?
                <input type="checkbox" checked={isBrand} onChange={toggleAppliesTo} className="w-8 h-8"/>
            </label>
            {!isBrand && (
                <>
                    <div className="grid grid-cols w-full h-full">
                        <input
                            placeholder="Search Product"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="bg-white p-3 rounded w-full h-15 text-xl"
                        />
                        {productSearch && (
                            <div className="flex flex-col w-full bg-white rounded shadow-xl max-h-60 overflow-auto z-10">
                                {products.length === 0 && (
                            <div className="p-2 text-gray-500">No products found</div>
                        )}
                        {products.map(product => {
                            const alreadyAdded = form.products.includes(product._id);
                            return(
                                <div
                                    key={product._id}
                                    onClick={() => {
                                    !alreadyAdded && addProduct(product);
                                    }}
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">{product.sku}</div>
                                </div>
                            );
                        })}
                    </div>
                    )}
                    </div>
                    <ul className="space-y-2">
                        {form.products.map((p: any) => {
                            return (
                            <li key={p._id} className="flex justify-between items-center h-15 bg-gray-100 p-2 rounded-lg">
                                {p.name}
                                <button onClick={() => removeItem(p._id, "product")} className="flex items-center justify-center bg-red-500 text-white px-2 py-2 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </li>
                            );
                        })}
                    </ul>
                </>
            )}
            {isBrand && (
                <>
                    <input
  placeholder="Search Brand"
  value={brandSearch}
  onChange={(e) => setBrandSearch(e.target.value)}
  className="bg-white p-3 rounded w-full h-15 text-xl"
/>

{brandSearch && (
  <div className="flex flex-col w-full bg-white rounded shadow-xl max-h-60 overflow-auto z-10">
    {brands.length === 0 && (
      <div className="p-2 text-gray-500">No brands found</div>
    )}

    {brands.map(brand => {
      const alreadyAdded = form.brands.includes(brand._id);

      return (
        <div
          key={brand._id}
          onClick={() => !alreadyAdded && addBrand(brand)}
          className={`p-2 cursor-pointer ${
            alreadyAdded
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-100"
          }`}
        >
          <div className="font-medium">{brand.name}</div>
        </div>
      );
    })}
  </div>
)}

                    <ul className="space-y-2">
  {form.brands.map((b: any) => {
    return (
      <li
        key={b._id}
        className="flex justify-between items-center h-15 bg-gray-100 p-3 rounded-xl"
      >
        {b.name}
        <button
          onClick={() => removeItem(b._id, "brand")}
          className="bg-red-500 text-white px-2 py-2 rounded-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
        </button>
      </li>
    );
  })}
</ul>
                </>
            )}
      </div>
      </div>
    );
  }