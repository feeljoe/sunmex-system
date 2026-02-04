"use client";

import { useList } from "@/utils/useList";
import { useEffect, useRef, useState } from "react";

export function StepInfo({ form, setForm }: any) {
    const supplierInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRefs = useRef<HTMLInputElement[]>([]);
    const [query, setQuery] = useState("");
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(0);
    const [highlightedProductIndex, setHighlightedProductIndex] = useState(0);

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
      setHighlightedSupplierIndex(0);
    }, [supplierSearch]);
    
    useEffect(() => {
      setHighlightedProductIndex(0);
    }, [productSearch]);    

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
            return [...prev,{...product, qty:0}, ];
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
      <div className="flex flex-col h-full w-full gap-5">
        <div className="grid grid-cols h-full w-full gap-4">
          <input
            ref={supplierInputRef}
            type="text"
            placeholder="Search Supplier..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            onKeyDown={(e) => {
              if(!supplierSearch || suppliers.length === 0) return;
              if(e.key === "ArrowDown"){
                e.preventDefault();
                setHighlightedSupplierIndex(i =>
                  Math.min(i + 1, suppliers.length - 1)
                );
              }
              if(e.key === "ArrowUp"){
                e.preventDefault();
                setHighlightedSupplierIndex(i =>
                  Math.max(i - 1, 0)
                );
              }
              if(e.key === "Enter"){
                e.preventDefault();
                const s = suppliers[highlightedSupplierIndex];
                if(!s) return;

                setForm((prev: any) => ({...prev, supplier: s._id}));
                setSelectedSupplier(s);
                setSupplierSearch("");

                setTimeout(() => productInputRef.current?.focus(), 0);
              }
            }}
            className="bg-white p-3 rounded w-full h-15 text-xl shadow-xl"
          />

          {supplierSearch.trim() && (
            <div className="absolute z-20 bg-white rounded-xl shadow-xl max-h-60 overflow-auto mt-10">
              {loadingSuppliers && (
                <div className="p-3 text-gray-500">Loading suppliers...</div>
              )}

              {!loadingSuppliers && suppliers.length === 0 && (
                <div className="p-3 text-gray-500">No suppliers found</div>
              )}

              {suppliers.map((s, index) => (
                <button
                  key={s._id}
                  type="button"
                  onMouseEnter={() => setHighlightedSupplierIndex(index)}
                  onClick={() => {
                    setForm((prev: any) => ({
                      ...prev,
                      supplier: s._id,
                    }));
                    setSelectedSupplier(s);
                    setSupplierSearch("");
                    setTimeout(() => productInputRef.current?.focus(), 0);
                  }}
                  className={`w-full text-left p-3 hover:bg-gray-100 transition
                    ${index === highlightedSupplierIndex
                      ? "bg-gray-200"
                      : "hover: bg-gray-100"
                    }
                  `}
                >
                  <div className="font-medium capitalize">{s.name.toLowerCase()}</div>
                </button>
              ))}
            </div>
          )}
          {selectedSupplier && (
          <div className="p-3 bg-white rounded-xl shadow-xl text-lg flex justify-between items-center capitalize">
            <span>{selectedSupplier.name.toLowerCase()}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedSupplier(null);
                setForm((prev: any) => ({ ...prev, supplier: "" }));
              }}
              className="text-red-500 hover:underline"
            >
              Change
            </button>
          </div>
        )}
      </div>
        <div className="grid grid-cols w-full h-full">
            <input
                ref={productInputRef}
                placeholder="Search Product"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if(!productSearch || products.length === 0) return;
                  if(e.key === "ArrowDown"){
                    e.preventDefault();
                    setHighlightedProductIndex(i =>
                      Math.min(i + 1, products.length - 1)
                    );
                  }
                  if(e.key === "ArrowUp"){
                    e.preventDefault();
                    setHighlightedProductIndex(i =>
                      Math.max(i - 1, 0)
                    );
                  }
                  if(e.key === "Enter"){
                    e.preventDefault();
                    const product = products[highlightedProductIndex];
                    if(!product) return;
                    addProduct(product);
                    setProductSearch("");
                    setTimeout(() => {
                      const lastIndex = selectedProducts.length;
                      qtyInputRefs.current[lastIndex]?.focus();
                    }, 0);
                  }
                }}
                className="bg-white p-3 rounded w-full h-15 text-xl"
            />
            {productSearch && (
              <div className="absolute w-full flex-col mt-10 bg-white rounded shadow-xl max-h-60 overflow-auto z-10">
                {products.length === 0 && (
                  <div className="p-2 text-gray-500">No products found</div>
                )}

                {products.map((product, index) => {
                    const alreadyAdded = selectedProducts.some(p=> p._id === product._id);
                    return(
                        <div
                            key={product._id}
                            onMouseEnter={() => setHighlightedProductIndex(index)}
                            onClick={() => {
                              if(alreadyAdded) return;
                              addProduct(product);
                              setProductSearch("");
                              setTimeout(() => {
                                qtyInputRefs.current[selectedProducts.length]?.focus();
                              }, 0);
                            }}
                            className={`p-2 hover:bg-gray-100 cursor-pointer 
                              ${index === highlightedProductIndex ? "bg-gray-200" : "hover:bg-gray-100"}
                              ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : ""}
                            `}
                        >
                            <div className="font-medium capitalize">{product.name.toLowerCase()}</div>
                            <div className="text-sm text-gray-500">{product.sku}</div>
                        </div>
                    );
                })}
              </div>
            )}
        </div>
        {/* Selected products */}
      <div className="flex-1 max-h-[40vh] space-y-2 rounded-xl shadow-xl">
        <table className="w-full">
          <thead className="bg-(--secondary)">
            <tr>
              <th className="p-2 text-left whitespace-nowrap" title="Products">Product</th>
              <th className="p-2 text-center whitespace-nowrap" title="Quantity">Qty</th>
              <th className="p-2 text-center whitespace-nowrap" title="Units Of Measure">UOM</th>
              <th className="p-2 text-right whitespace-nowrap" title="Delete">Delete</th>
            </tr>
          </thead>
          <tbody className="bg-white">
          {selectedProducts.map((p, i) => (
            <tr key={i} className="border-b">
              <td className="p-2 whitespace-nowrap flex flex-col">
                <span className="capitalize text-sm lg:text-lg">{p.name.toLowerCase()}</span>
                <span className="text-gray-400 text-sm lg:text-md">{p.sku}</span>
              </td>
              <td className="whitespace-nowrap text-center">
                <input
                  ref={el => {
                    if(el) qtyInputRefs.current[i] = el;
                  }}
                  type="number"
                  inputMode="numeric"
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
                  onKeyDown={(e) => {
                    if(e.key === "Enter") {
                      e.preventDefault();
                      productInputRef.current?.focus();
                    }
                  }}
                  className="w-20 py-2 lg:py-4 bg-white shadow-xl rounded-xl text-center text-sm lg:text-lg"
                />
              </td>
              <td className="whitespace-nowrap text-center">Units</td>
              <td className="whitespace-nowrap text-right p-2">
                <button className='text-white bg-red-500 px-4 py-2 text-lg rounded-xl hover:underline cursor-pointer hover:bg-red-300 hover:text-(--quarteary) transition-all duration:300' onClick={() => removeProduct(p._id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </td>
        </tr>
      ))}

          </tbody>
        </table>
        
    </div>
      </div>
    );
  }