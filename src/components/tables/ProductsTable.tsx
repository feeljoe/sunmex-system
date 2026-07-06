"use client";
import { useList } from '@/utils/useList';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../modals/ConfirmModal';
import SubmitResultModal from '../modals/SubmitResultModal';
import { productConfirmConfig } from '../modals/configConfirms/confirmConfig';
import { SearchBar } from '../ui/SearchBar';
import { RefreshButton } from '../ui/RefreshButton';
import EditProductModal from '../modals/EditProductModal';
import { useLookupMap } from '@/utils/useLookupMap';
import { formatCurrency } from '@/utils/format';
import Link from 'next/link';
import { PaginatedSelect } from '../ui/PaginatedSelect';

export function ProductsTable() {

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null > (null);
  const [message, setMessage] = useState< string | null >(null);
  const [edit, setEdit] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const { items, total, reload } = useList('/api/products', {
    page,
    limit,
    search,
    brand: selectedBrand,
    type: selectedType,
  });

  const resetFilters = () => {
    setSelectedBrand("");
    setSelectedType("");
  };

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, selectedBrand, selectedType]);
  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);}, 3000);
  }, [reload]);
  
      const requestDelete = (product: any) => {
          setProductToDelete(product);
          setConfirmOpen(true);
      };
  
      const confirmDelete = async (id: string) => {
          setMessage(null);
          setSubmitStatus("loading");
          try {
              if(!productToDelete) return;
              await fetch(`/api/products/${id}`, {
                  method: "DELETE",
              });
              setMessage("Product deleted successfully");
              setSubmitStatus("success")
              setProductToDelete(null);
              reload();
          }catch(err: any){
              setMessage(err.message || "Error");
              setSubmitStatus("error");
            }
          
      };
  
      const cancelDelete = () => {
          setConfirmOpen(false);
          setProductToDelete(null);
      };

      const totalPages = total > 0? Math.ceil(total/limit): 1;

      const getMarginColor = (value: number): string => {
        if (value < 0) return "text-red-600";
        if (value < 15) return "text-orange-600";
        if (value < 30) return "text-yellow-600";
        return "text-green-600";
      };
      

  return (
  <>
    <div className='h-[75vh] w-[90vw]'>
    <div className="flex items-center justify-end py-2">
      <Link href="/pages/catalogues/products/add-product">
        <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
            Add Product
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        </button>
      </Link>
    </div>
    <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-5'>
      <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
      <div className="flex gap-4 mb-5 items-center justify-center">
        <PaginatedSelect
          endpoint="/api/brands"
          value={selectedBrand}
          onChange={setSelectedBrand}
          placeholder="All Brands"
        />
        <PaginatedSelect
          endpoint="/api/types"
          value={selectedType}
          onChange={setSelectedType}
          placeholder="All Types"
        />
        {(selectedBrand || selectedType) && (
          <button 
            onClick={() => { resetFilters(); }}
            className="text-md p-2 rounded-xl bg-red-400 text-white hover:underline hover:bg-red-200 transition-all duration:300 cursor-pointer whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>
      <div className="flex justify-between items-center gap-5 mb-4">
        <SearchBar
            placeholder="Search products..."
            onSearch={setSearch}
            debounce
        />
        
        <RefreshButton onRefresh={() => {reload(); setSubmitStatus("loading");}}/>
      </div>
      <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
      <table className='w-full text-left'>
        <thead className='sticky top-0 z-10 bg-(--tertiary)'>
          <tr className='border-b-3 text-lg font-mono'>
            <th className='px-4 py-2'>SKU</th>
            <th className='px-4 py-2'>UPC</th>
            <th className='px-4 py-2'>Brand</th>
            <th className='px-4 py-2'>Name</th>
            <th className='px-4 py-2'>Category</th>
            <th className='px-4 py-2'>Cost</th>
            <th className='px-4 py-2'>Price</th>
            <th className='px-4 py-2'>Margin</th>
            <th className='px-4 py-2 text-center'>Edit</th>
            <th className='px-4 py-2 text-center'>Delete</th>
          </tr>
        </thead>
        <tbody className='bg-white'>
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className='p-4 text-center text-2xl text-gray-600'>
                No products found
              </td>
            </tr>
          )}

          {items.map((it: any) => { 
            const margin = ((it.unitPrice-it.unitCost)/it.unitPrice)*100; 
            return (
              <tr key={it._id} className='border-b border-gray-400 font-mono font-bold'>
              <td className='px-2 py-2'>{it.sku}</td>
              <td className='px-2 py-2'>{it.upc}</td>
              <td className='px-2 py-2 capitalize'>{it.brand?.name.toLowerCase()}</td>
              <td className='px-2 py-2 capitalize whitespace-nowrap'>
                <p>{it.name.toLowerCase()}</p>
                <p>{it.weight? `(${it.weight}${it.unit?.toUpperCase()})`: ""} {it.caseSize? `(${it.caseSize} Per Case)`: ""}</p>
              </td>
              <td className='px-4 py-2 capitalize'>{it.productType?.name?.toLowerCase()}</td>
              <td className='px-2 py-2 text-right'>{formatCurrency(it.unitCost) ?? '-'}</td>
              <td className='px-2 py-2 text-right'>{formatCurrency(it.unitPrice) ?? '-'}</td>
              <td className={`px-2 py-2 text-right ${getMarginColor(margin)}`}>{margin.toFixed(1)}%</td>
              <td className='p-2 text-center'>
                <button 
                  className="text-blue-800 bg-blue-400 p-2 text-lg rounded-xl hover:bg-blue-800 hover:text-white cursor-pointer transition-all duration:500"
                  onClick={() => {setEdit(true); setSelectedProduct(it);}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              </td>
              <td className='p-2 text-center'>
                  <button 
                    className='text-red-800 bg-red-400 p-2 text-lg rounded-xl hover:bg-red-800 hover:text-white cursor-pointer transition-all duration:500' 
                    onClick={() => requestDelete(it)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
              </td>
            </tr>
            )})}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
        <span>
          Showing {items.length} of {total} products
        </span>
        <button
          disabled={page === 1}
          onClick={() => {
            handleSetPage("back");
            setTimeout(() => setSubmitStatus(null), 1000);
          }}
          className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page === 1 ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>

        <span className="px-3 py-1">
          Page {page} of {totalPages || 1}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => {
            handleSetPage("forward");
            setTimeout(() => setSubmitStatus(null), 1000);
          }}
          className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
    </div>
    {edit &&
      <EditProductModal
        open={edit}
        product={selectedProduct}
        onClose={() => {
          setEdit(false);
          setSelectedProduct(null);
          reload();
          }
        }
        onUpdated={() => {
          setEdit(false);
          setSelectedProduct(null);
          }
        }
       />
      }
    {confirmOpen &&
      <ConfirmModal
          open={confirmOpen}
          title="Confirm Product Deletion"
          data={productToDelete}
          sections={productConfirmConfig()} // <--- Remove the {brandMap} from here
          onConfirm={() => {
              confirmDelete(productToDelete._id);
              setConfirmOpen(false);
          }}
          onBack={cancelDelete}
          />
    }
    {submitStatus && (
      <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
              setSubmitStatus(null);
          }}
          collection="Product"
      />
    )}
  </>
  );
}
