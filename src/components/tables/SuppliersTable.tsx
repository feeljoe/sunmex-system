"use client";
import { useEffect, useState } from 'react';
import { RefreshButton } from '../ui/RefreshButton';
import { useList } from '@/utils/useList';
import { SearchBar } from '../ui/SearchBar';
import { ConfirmModal } from '../modals/ConfirmModal';
import SubmitResultModal from '../modals/SubmitResultModal';
import { supplierConfirmConfig } from '../modals/configConfirms/confirmConfig';

export function SuppliersTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const { items, total, reload } = useList('/api/suppliers', {
    page,
    limit,
    search,
  });

  useEffect(() => {
    setPage(1);
  }, [search]);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
    const [supplierToDelete, setsupplierToDelete] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null > (null);
    const [message, setMessage] = useState< string | null >(null);
    
        const requestDelete = (supplier: any) => {
            setsupplierToDelete(supplier);
            setConfirmOpen(true);
        };
    
        const confirmDelete = async (id: string) => {
            setMessage(null);
            setSubmitStatus("loading");
            try {
                if(!supplierToDelete) return;
                await fetch(`/api/suppliers/${id}`, {
                    method: "DELETE",
                });
                setMessage("Supplier deleted successfully");
                setSubmitStatus("success")
                setsupplierToDelete(null);
                reload();
            }catch(err: any){
                setMessage(err.message || "Error");
                setSubmitStatus("error");
              }
            
        };
    
        const cancelDelete = () => {
            setConfirmOpen(false);
            setsupplierToDelete(null);
        };

        const totalPages = total > 0? Math.ceil(total/limit): 1;

  return (
    <>
    <div className='bg-(--secondary) rounded-lg shadow p-6 flex flex-col h-4/5'>
      <div className="flex justify-between items-center mb-4">
              <SearchBar
                  placeholder="Search chains..."
                  onSearch={setSearch}
                  debounce
              />
              <RefreshButton onRefresh={reload}/>
            </div>
            <div className='flex-1 overflow-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='border-b'>
            <th className='p-2'>Name</th>
            <th className='p-2'>Contact</th>
            <th className='p-2'>Email</th>
            <th className='p-2'>Phone</th>
            <th className='p-2'></th>
          </tr>
        </thead>
        <tbody>
        {items.length === 0 && (
            <tr>
              <td colSpan={8} className='p-4 text-center text-gray-500'>
                No suppliers found
              </td>
            </tr>
          )}
          {items.map((it: any) => (
            <tr key={it._id} className='border-b'>
              <td className='p-2 whitespace-nowrap capitalize'>{it.name.toLowerCase()}</td>
              <td className='p-2 whitespace-nowrap'>{it.contact ?? '-'}</td>
              <td className='p-2 whitespace-nowrap'>{it.email ?? '-'}</td>
              <td className='p-2 whitespace-nowrap'>{it.phoneNumber ?? '-'}</td>
              <td className='p-2 text-right whitespace-nowrap'>
                  <button className='text-white bg-red-500 px-5 py-3 text-lg rounded-xl hover:underline cursor-pointer hover:bg-red-300 hover:text-(--quarteary) transition-all duration:300' onClick={() => requestDelete(it)}>
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
      <div className="flex justify-end items center gap-4 mt-4">
              <span className='mt-1'>
                Showing {items.length} of {total} suppliers
              </span>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-(--quarteary) text-white rounded-xl shadow-xl disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
      
              <span className="px-3 py-1">
                Page {page} of {totalPages || 1}
              </span>
      
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
          {confirmOpen &&
            <ConfirmModal
              open={confirmOpen}
              title="Confirm Supplier Deletion"
              data={supplierToDelete}
              sections={supplierConfirmConfig}
              onConfirm={() => {
                  confirmDelete(supplierToDelete._id);
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
                collection="Supplier"
            />
          )}
          </>
  );
}