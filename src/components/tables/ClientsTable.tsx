"use client";
import { useList } from '@/utils/useList';
import { useEffect, useState } from 'react';
import { useFilteredList } from '../ui/hooks/useFilteredList';
import SubmitResultModal from '../modals/SubmitResultModal';
import { clientConfirmConfig } from '../modals/configConfirms/confirmConfig';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SearchBar } from '../ui/SearchBar';
import { RefreshButton } from '../ui/RefreshButton';
import EditClientModal from '../modals/EditClientModal';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import { PaginatedSelect } from '../ui/PaginatedSelect';


export function ClientsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState("");
  const { items, total, reload } = useList('/api/clients', {
    page,
    limit,
    search,
    chain: selectedChain,
    paymentTerm: selectedPaymentTerm,
  });
  useEffect(() => {
        setPage(1);
      }, [search, selectedChain, selectedPaymentTerm]);

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);},3000);
  }, [reload]);

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);}, 1000);
  }, [handleSetPage]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null > (null);
    const [message, setMessage] = useState< string | null >(null);
    const [editOpen, setEditOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<any | null>(null);
    const { items: chains } = useList("/api/chains", { limit: 1000 });
    const { items: paymentTerms } = useList("/api/paymentTerms", { limit: 1000 });
    
        const requestDelete = (client: any) => {
          setClientToDelete(client);
            setConfirmOpen(true);
            console.log("CLIENT TO DELETE:", client);

        };
    
        const confirmDelete = async (id: string) => {
            setMessage(null);
            setSubmitStatus("loading");
            try {
                if(!clientToDelete) return;
                await fetch(`/api/clients/${id}`, {
                    method: "DELETE",
                });
                setMessage("Client deleted successfully");
                setSubmitStatus("success")
                setClientToDelete(null);
                reload();
            }catch(err: any){
                setMessage(err.message || "Error");
                setSubmitStatus("error");
              }
            
        };
    
        const cancelDelete = () => {
            setConfirmOpen(false);
            setClientToDelete(null);
        };
        const totalPages = total > 0? Math.ceil(total/limit): 1;

        const resetFilters = () => {
          setSelectedChain("");
          setSelectedPaymentTerm("");
        };
  return (
    <>
    <div className='h-[75vh] w-[90vw]'>
      <div className="flex items-center justify-end py-2">
        <Link href="/pages/management/clients/add-client">
          <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
              Add Client
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
          </button>
        </Link>
          
      </div>
    <div className='bg-(--secondary) rounded-lg shadow-xl p-6 flex flex-col h-full w-full'>
      <p className="border-b border-(--quarteary) font-mono text-center text-xl font-bold mb-4">Filters</p>
      <div className="flex gap-4 mb-5 items-center justify-center">
              <PaginatedSelect
                endpoint="/api/chains"
                value={selectedChain}
                onChange={setSelectedChain}
                placeholder="All Chains"
              />
              <PaginatedSelect
                endpoint="/api/paymentTerms"
                value={selectedPaymentTerm}
                onChange={setSelectedPaymentTerm}
                placeholder="All Payment Terms"
              />
              {(selectedChain || selectedPaymentTerm) && (
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
                  placeholder="Search clients..."
                  onSearch={setSearch}
                  debounce
              />
              <RefreshButton onRefresh={() => {reload(); setSubmitStatus("loading")}}/>
            </div>
            <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
      <table className='w-full text-left'>
        <thead className='sticky top-0 z-10 bg-(--tertiary)'>
          <tr className='border-b-3 text-lg font-mono'>
            <th className='px-2 py-2 text-center'>Client Number</th>
            <th className='px-2 py-2'>Client Name</th>
            <th className='px-2 py-2'>Chain</th>
            <th className='px-2 py-2'>Full Address</th>
            <th className='px-2 py-2'>Payment Term</th>
            <th className='px-2 py-2 text-right'>Credit Limit</th>
            <th className="px-2 py-2 text-center">Visiting Days</th>
            <th className='px-2 py-2 text-center'>Edit</th>
            <th className='px-2 py-2 text-center'>Delete</th>
          </tr>
        </thead>
        <tbody className='bg-white'>
        {items.length === 0 && (
            <tr>
              <td colSpan={9} className='p-4 text-center text-2xl text-gray-600'>
                No clients found
              </td>
            </tr>
          )}
          {items.map((it: any) => (
            <tr key={it._id} className='border-b border-gray-400 font-mono font-bold'>
              <td className='p-2'>{it.clientNumber}</td>
              <td className='p-2 capitalize'>{it.clientName.toLowerCase()}</td>
              <td className='p-2 capitalize'>{it.chain?.name.toLowerCase() || '-'}</td>
              <td className='p-2 capitalize  whitespace-nowrap'>
                <p>{it.billingAddress?.addressLine?.toLowerCase()},</p>
                <p>{it.billingAddress?.city?.toLowerCase()} {it.billingAddress?.state}, {it.billingAddress?.zipCode}</p>
              </td>
              <td className='p-2 '>{it.paymentTerm?.name || '-'}</td>
              <td className='p-2 text-right'>{formatCurrency(it.creditLimit) ?? formatCurrency(0)}</td>
              <td className="p-2 text-center capitalize">
                {it.visitingDays.map((item: any) => {
                  return item.toLowerCase()
                })}
              </td>
              <td className='p-2 text-center'>
                <button 
                  className="text-blue-800 bg-blue-400 p-2 text-lg rounded-xl hover:bg-blue-800 hover:text-white cursor-pointer transition-all duration:500"
                  onClick={() => {
                    setClientToEdit(it); 
                    setEditOpen(true);
                  }}
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
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
        <span>
          Showing {items.length} of {total} products
        </span>
        <button
          disabled={page === 1}
          onClick={() => handleSetPage("back")}
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
          onClick={() => handleSetPage("forward")}
          className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
    </div>
    {confirmOpen &&
          <ConfirmModal
              open={confirmOpen}
              title="Confirm Client Deletion"
              data={clientToDelete}
              sections={clientConfirmConfig}
              onConfirm={() => {
                  confirmDelete(clientToDelete._id);
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
              collection="Client"
          />
        )}
        {editOpen && (
          <EditClientModal
            open={editOpen}
            client={clientToEdit}
            chains={chains}
            paymentTerms={paymentTerms}
            onClose={()=> setEditOpen(false)}
            onSaved={reload}
            />
        )}
      </>
  );
}
