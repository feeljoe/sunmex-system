"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";

export function StepInfo({ form, setForm }: any) {
    const [query, setQuery] = useState("");
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    const {
      items: suppliers,
      loading: loadingSuppliers,
    } = useList('/api/suppliers', {
      search: supplierSearch,
    });
    const {
      items: products,
      loading: loadingProducts,
    } = useList('/api/products', {
      search: productSearch,
    });

    useEffect(() => {
        const productsForForm = selectedProducts.map((p: any) => ({
            product: p._id,
            name: p.name,
            quantity: p.qty ?? 0,
            unitCost: p.unitCost ?? 0,
          }));
        const expectedTotal = productsForForm.reduce(
            (sum: number, p:any) => sum + p.quantity * p.unitCost, 
            0
        );
        setForm((prev: any) => ({
          ...prev,
          products: productsForForm,
          expectedTotal: expectedTotal,
        }));
      }, [selectedProducts, setForm]);

    function addProduct(product: any){
        setSelectedProducts(prev => {
            const existing = prev.find(p => p._id === product._id);
            if(existing) {
                return prev.map(p =>
                    p._id === product._id
                    ? { ...p, qty: p.qty + 1 }
                    : p
                );
            }
            return [...prev, {...product, qty:0}];
        });
    }

    function removeProduct(productId: string) {
        setSelectedProducts(prev =>
          prev.filter(p => p._id !== productId)
        );
      }
      

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase()) ||
        p.vendorSku?.toLowerCase().includes(query.toLowerCase()) ||
        p.upc?.toLowerCase().includes(query.toLowerCase())
      );
      
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>){
          const { name, value } = e.target;
          setForm((prev: any) => ({ ...prev, [name]: value }));
    } 

    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-5">
        <div className="grid grid-cols h-full w-full gap-4">
        <select
            name="supplier"
            value={form.supplier}
            onChange={handleChange}
            className="bg-white rounded w-full h-15 text-lg"
        >
            <option value="">Select Supplier</option>
            {suppliers.map(s=> (
                <option key={s._id} value={s._id}>
                    {s.name}
                </option>
            ))}
        </select>
        </div>
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
            const alreadyAdded = selectedProducts.some(p=> p._id === product._id);
            return(
                <div
                    key={product._id}
                    onClick={() => {
                    !alreadyAdded && addProduct(product);
                    setProductSearch("");
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
        {/* Selected products */}
    <div className="space-y-2 w-full">
      {selectedProducts.map((p, i) => (
        <div key={i} className="flex items-center rounded h-full w-full gap-4">
          <span className="flex w-full py-4 bg-white rounded-xl items-center justify-center text-lg shadow-xl">{p.name} - {p.sku}</span>
          
          <input
            type="number"
            min={0}
            value={p.qty}
            onChange={(e) => {
              const qty = Number(e.target.value);
              setSelectedProducts(prev =>
                prev.map((item, idx) =>
                  idx === i ? { ...item, qty } : item
                )
              );
            }}
            className="w-20 py-4 bg-white shadow-xl rounded-xl text-center text-xl"
          />
          <input disabled placeholder="Units" className="bg-white p-3 rounded-xl w-20 py-4 text-xl shadow-xl"/>
          <button className='text-white bg-red-500 px-5 py-5 text-lg rounded-xl hover:underline cursor-pointer hover:bg-red-300 hover:text-(--quarteary) transition-all duration:300' onClick={() => removeProduct(p._id)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      ))}
    </div>
      </div>
    );
  }