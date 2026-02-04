"use client";
import { useList } from '@/utils/useList';
import { RefreshButton } from '../ui/RefreshButton';
import { SearchBar } from '../ui/SearchBar';
import { useEffect, useState } from 'react';
import { SupplierReceiptSummaryModal } from '../modals/SupplierReceiptSummaryModal';

export function SupplierReceiptsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  const orderSummary = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowSummary(true);
  }

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
      <div className='flex-1 overflow-x-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='border-b'>
            <th className='p-2 whitespace-nowrap'>Invoice</th>
            <th className='p-2 whitespace-nowrap'>PO Number</th>
            <th className='p-2 whitespace-nowrap'>Supplier</th>
            <th className='p-2 whitespace-nowrap'>Total</th>
            <th className='p-2 whitespace-nowrap'>Date of Request</th>
            <th className='p-2 whitespace-nowrap'>Date Arrived</th>
            <th className='p-2 whitespace-nowrap'>Elaborated By</th>
            <th className='p-2 whitespace-nowrap'>Status</th>
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
            <tr key={it._id} className='border-b hover:bg-gray-200 cursor-pointer' onClick={() => orderSummary(it)}>
              <td className='p-2 whitespace-nowrap'>{it.invoice}</td>
              <td className='p-2 whitespace-nowrap'>{it.poNumber}</td>
              <td className='p-2 whitespace-nowrap capitalize'>{it.supplier?.name.toLowerCase()}</td>
              <td className='p-2 whitespace-nowrap'>{formatCurrency(it.total)}</td>
              <td className='p-2 whitespace-nowrap text-center'>{formatDate(it.requestedAt)}</td>
              <td className='p-2 whitespace-nowrap text-center'>{formatDate(it.receivedAt)}</td>
              <td className='p-2 whitespace-nowrap capitalize'>{it.elaboratedBy.firstName.toLowerCase()} {it.elaboratedBy.lastName.toLowerCase()}</td>
              <td className='p-2 whitespace-nowrap'><p className={it.supplierOrder.status === `received`? "p-2 text-center text-white rounded-xl font-bold bg-green-500" : ""}>{it.supplierOrder.status.toUpperCase()} </p></td>
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
      <SupplierReceiptSummaryModal
        open={showSummary}
        receipt={selectedReceipt}
        onClose={() => {
          setShowSummary(false);
          setSelectedReceipt(null);
        }}/>
    </div>
  );
}
