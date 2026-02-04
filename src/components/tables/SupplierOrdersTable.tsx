"use client";
import { useList } from '@/utils/useList';
import { useEffect, useState } from 'react';
import { useFilteredList } from '../ui/hooks/useFilteredList';
import { SearchBar } from '../ui/SearchBar';
import { ConfirmModal } from '../modals/ConfirmModal';
import { supplierOrderConfirmConfig } from '../modals/configConfirms/confirmConfig';
import SubmitResultModal from '../modals/SubmitResultModal';
import { RefreshButton } from '../ui/RefreshButton';
import EditSupplierOrderModal from '../modals/EditSupplierOrder';
import { useLookupMap } from '@/utils/useLookupMap';

export function SupplierOrdersTable() {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    assigned: "bg-(--tertiary)",
    ready: "bg-blue-500 text-white",
    received: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
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
    
        const filteredItems = useFilteredList(
            items,
            search,
            (order: any, q) =>
                order.poNumber.toLowerCase().includes(q) ||
                order.supplier?.name.toLowerCase().includes(q) ||
                order.requestedAt.toLowerCase().includes(q) ||
                String(order.expectedTotal).includes(q) ||
                order.elaboratedBy.toLowerCase().includes(q)
        );
    
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
  const formatCurrency = (value?: number) =>
    value != null ? `$${value.toFixed(2)}` : "-";

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
  return (
    <>
    <div className='bg-(--secondary) rounded-lg shadow p-6 flex flex-col h-4/5'>
      <div className='flex justify-between'>
      <SearchBar
          placeholder="Search brands..."
          onSearch={setSearch}
          debounce
      />
      <RefreshButton onRefresh={reload}/>
      </div>
      <div className='flex-1 overflow-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='border-b'>
            <th className='p-2'>PO Number</th>
            <th className='p-2'>Supplier</th>
            <th className='p-2'>Total</th>
            <th className='p-2'>Date of Request</th>
            <th className='p-2'>Elaborated By</th>
            <th className='p-2'>Status</th>
            <th className='p-2 text-right'>Edit</th>
            <th className='p-2 text-right'>Delete</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((it: any) => (
            <tr key={it._id} className='border-b'>
              <td className='p-2 whitespace-nowrap'>{it.poNumber}</td>
              <td className='p-2 whitespace-nowrap capitalize'>{it.supplier?.name.toLowerCase()}</td>
              <td className='p-2 whitespace-nowrap'>{formatCurrency(it.expectedTotal)}</td>
              <td className='p-2 whitespace-nowrap'>{formatDate(it.requestedAt)}</td>
              <td className='p-2 whitespace-nowrap capitalize'>{it.elaboratedBy.toLowerCase()}</td>
              <td className='p-2 whitespace-nowrap'><span className={`p-2 rounded-xl ${statusColors[it.status]}`}>{it.status.toUpperCase()}</span></td>
              {it.status !== "received" &&
              <td className='p-2 text-right'>
                <button className="text-white bg-blue-500 px-5 py-3 text-lg rounded-xl hover:underline cursor-pointer hover:bg-(--tertiary) hover:text-(--quarteary) transition-all duration:300" onClick={() => openEdit(it)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
              </button>
              </td>
              }
              {it.status !== "received" &&
              <td className='p-2 text-right whitespace-nowrap'>
                  <button className='text-white bg-red-500 px-5 py-3 text-lg rounded-xl hover:underline cursor-pointer hover:bg-red-300 hover:text-(--quarteary) transition-all duration:300' onClick={() => requestDelete(it)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                  </button>
              </td>
              }
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end items center gap-4 mt-4">
            <span className='mt-1'>
              Showing {items.length} of {total} supplier orders
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
        </>
  );
}
