"use client";
import { useList } from '@/utils/useList';
import { RefreshButton } from '../ui/RefreshButton';
import { SearchBar } from '../ui/SearchBar';
import { useEffect, useState } from 'react';

export function SupplierReceiptsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";
 
  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const { items, total, reload } = useList('/api/supplierReceipts', {
    page,
    limit,
    search,
  });
  useEffect(() => {
        setPage(1);
      }, [search]);
  
  const totalPages = total > 0? Math.ceil(total/limit): 1;

  return (
    <div className='bg-(--secondary) rounded-lg shadow p-6 flex flex-col h-4/5'>
      <div className="flex justify-between items-center mb-4">
              <SearchBar
                  placeholder="Search Invoice..."
                  onSearch={setSearch}
                  debounce
              />
              <RefreshButton onRefresh={reload}/>
            </div>
      <div className='flex-1 overflow-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='border-b'>
            <th className='p-2'>Invoice</th>
            <th className='p-2'>PO Number</th>
            <th className='p-2'>Supplier</th>
            <th className='p-2'>Total</th>
            <th className='p-2'>Date of Request</th>
            <th className='p-2'>Date Arrived</th>
            <th className='p-2'>Elaborated By</th>
            <th className='p-2'>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className='p-4 text-center text-gray-500'>
                No receipts found
              </td>
            </tr>
          )}
          {items.map((it: any) => (
            <tr key={it._id} className='border-b'>
              <td className='p-2 whitespace-nowrap'>{it.invoice}</td>
              <td className='p-2 whitespace-nowrap'>{it.poNumber}</td>
              <td className='p-2 whitespace-nowrap'>{it.supplier?.name}</td>
              <td className='p-2 whitespace-nowrap'>{formatCurrency(it.total)}</td>
              <td className='p-2 whitespace-nowrap'>{formatDate(it.requestedAt)}</td>
              <td className='p-2 whitespace-nowrap'>{formatDate(it.receivedAt)}</td>
              <td className='p-2 whitespace-nowrap'>{it.elaboratedBy.firstName} {it.elaboratedBy.lastName}</td>
              <td className='p-2 whitespace-nowrap'>{it.supplierOrder.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end items center gap-4 mt-4">
        <span className='mt-1'>
          Showing {items.length} of {total} receipts
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
  );
}
