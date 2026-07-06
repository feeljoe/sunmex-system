"use client";
import { useList } from '@/utils/useList';
import { useEffect, useState } from 'react';
import { SearchBar } from '../ui/SearchBar';
import { ConfirmModal } from '../modals/ConfirmModal';
import { supplierOrderConfirmConfig } from '../modals/configConfirms/confirmConfig';
import SubmitResultModal from '../modals/SubmitResultModal';
import { RefreshButton } from '../ui/RefreshButton';
import EditSupplierOrderModal from '../modals/EditSupplierOrder';
import { useLookupMap } from '@/utils/useLookupMap';
import { formatCurrency } from '@/utils/format';
import Link from 'next/link';

export function SupplierOrdersTable() {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    received: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const { items, total, reload } = useList('/api/supplierOrders', {
    page,
    limit,
    search,
  });
  useEffect(() => {
    setPage(1);
  }, [search]);
      
  const [confirmOpen, setConfirmOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null > (null);
    const [message, setMessage] = useState< string | null >(null);
    
        const requestDelete = (order: any) => {
            setOrderToDelete(order);
            setConfirmOpen(true);
        };
    
        const confirmDelete = async (id: string) => {
            setMessage(null);
            setSubmitStatus("loading");
            try {
                if(!orderToDelete) return;
                await fetch(`/api/supplierOrders/${id}`, {
                    method: "DELETE",
                });
                setMessage("Order deleted successfully");
                setSubmitStatus("success")
                setOrderToDelete(null);
                setConfirmOpen(false);
                reload();
            }catch(err: any){
                setMessage(err.message || "Error");
                setSubmitStatus("error");
              }
            
        };
    
        const cancelDelete = () => {
            setConfirmOpen(false);
            setOrderToDelete(null);
        };

  const formatDate = (value?: string | Date) =>{
    if(!value) return "-";
    const date = new Date(value);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const [editOpen, setEditOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);

  const openEdit = (order: any) => {
    setOrderToEdit(order);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setOrderToEdit(null);
  };

  const totalPages = total > 0? Math.ceil(total/limit): 1;
  const {map: supplierMap} = useLookupMap("/api/suppliers");

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  return (
    <>
    <div className='h-[75vh] w-[90vw]'>
    <div className="flex items-center justify-end py-2">
    <Link href="/pages/inventory/supplier-orders/add-supplier-order">
        <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
            New Order
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        </button>
      </Link>
    </div>
    <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-5'>
      <div className='flex justify-between gap-5 mb-4'>
      <SearchBar
          placeholder="Search supplier orders..."
          onSearch={setSearch}
          debounce
      />
      <RefreshButton onRefresh={() => {
        setSubmitStatus("loading");
        reload(); 
        setTimeout(() => setSubmitStatus(null), 3000);
        }}
      />
      </div>
      <div className='flex-1 overflow-auto mt-2 rounded-xl shadow-xl'>
      <table className='w-full text-left font-mono font-bold'>
        <thead className='bg-(--tertiary) top-0 sticky'>
          <tr className='border-b'>
            <th className='p-2 whitespace-nowrap'>PO Number</th>
            <th className='p-2 whitespace-nowrap'>Supplier</th>
            <th className='p-2 whitespace-nowrap'>Total</th>
            <th className='p-2 whitespace-nowrap'>Date of Request</th>
            <th className='p-2 whitespace-nowrap'>Elaborated By</th>
            <th className='p-2 whitespace-nowrap'>Status</th>
            <th className='p-2 text-right whitespace-nowrap'>Edit</th>
            <th className='p-2 text-right whitespace-nowrap'>Delete</th>
          </tr>
        </thead>
        <tbody className='bg-white'>
          {items.map((it: any) => (
            <tr key={it._id} className='border-b whitespace-nowrap'>
              <td className='p-2'>{it.poNumber}</td>
              <td className='p-2 capitalize'>{it.supplier?.name.toLowerCase()}</td>
              <td className='p-2 text-right'>{formatCurrency(it.expectedTotal)}</td>
              <td className='p-2 text-center'>{formatDate(it.requestedAt)}</td>
              <td className='p-2 capitalize'>{it.elaboratedBy.toLowerCase()}</td>
              <td className='p-2'><span className={`p-2 rounded-xl ${statusColors[it.status]}`}>{it.status.toUpperCase()}</span></td>
              {it.status !== "received" ? (
              <td className='p-2 text-right'>
                <button className="text-blue-800 bg-blue-400 p-2 rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-all duration:300" onClick={() => openEdit(it)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
              </button>
              </td>
              ) : (
                <td className='p-2 text-center'>-</td>
              )
              }
              {it.status !== "received" ? (
              <td className='p-2 text-right whitespace-nowrap'>
                  <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:300' onClick={() => requestDelete(it)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                  </button>
              </td>
              ) : (
                <td className='p-2 text-center'>-</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
        <span>
          Showing {items.length} of {total} Supplier Orders
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
            handleSetPage("forward")
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
    
    {confirmOpen &&
          <ConfirmModal
            open={confirmOpen}
            title="Confirm Order Deletion"
            data={orderToDelete}
            sections={supplierOrderConfirmConfig({supplierMap})}
            onConfirm={() => confirmDelete(orderToDelete._id)}
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
              collection="Order"
          />
        )}
        {editOpen && orderToEdit && (
          <EditSupplierOrderModal
            open={editOpen}
            order={orderToEdit}
            onClose={closeEdit}
            onUpdated={reload}
          />
        )}
        </div>
        </>
  );
}