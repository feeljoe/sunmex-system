"use client";
import { useList } from '@/utils/useList';
import { RefreshButton } from '../ui/RefreshButton';
import { SearchBar } from '../ui/SearchBar';
import { useEffect, useState } from 'react';
import { SupplierReceiptSummaryModal } from '../modals/SupplierReceiptSummaryModal';
import SubmitResultModal from '../modals/SubmitResultModal';
import { formatCurrency } from '@/utils/format';
import SupplierReceiptMobileCard from '../mobile/SupplierReceiptMobileCard';
import EditSupplierReceiptModal from '../modals/EditSupplierReceiptModal';

export function SupplierReceiptsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);

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

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const orderSummary = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowSummary(true);
  }

  const handleSetPage = (value: string) => {
    setSubmitStatus("loading");
    if (value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="flex h-[82dvh] sm:h-[85dvh] min-h-0 w-full flex-col rounded-xl bg-(--secondary) p-2 shadow">
      <div className="flex justify-between items-center gap-2 mb-2">
        <SearchBar
          placeholder="Search Invoice..."
          onSearch={setSearch}
          debounce
        />
        <RefreshButton onRefresh={() => {
          setSubmitStatus("loading");
          reload();
          setTimeout(() => { setSubmitStatus(null); }, 3000);
        }}
        />
      </div>
      <span className='sm:hidden text-xs font-bold'>
        Found {total} Supplier Receipts
      </span>
      <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl'>
        <div className='space-y-2 p-1 lg:hidden'>
          {items.length === 0 ? (
            <div className='rounded-xl bg-white p-8 text-center text-gray-500'>
              No Supplier receipts found
            </div>
          ) : (
            items.map((receipt: any) => (
              <SupplierReceiptMobileCard
                key={receipt._id}
                receipt={receipt}
                onOpen={orderSummary}
              />
            ))
          )}
        </div>
        <div className='hidden h-full overflow-auto rounded-xl shadow lg:block'>
          <table className='w-full text-left font-mono font-bold'>
            <thead className='bg-(--tertiary) sticky top-0'>
              <tr className='border-b whitespace-nowrap'>
                <th className='p-2'>Invoice #</th>
                <th className='p-2'>PO-Number</th>
                <th className='p-2'>Supplier</th>
                <th className='p-2'>Total</th>
                <th className='p-2'>Date of Request</th>
                <th className='p-2'>Date Arrived</th>
                <th className='p-2'>Elaborated By</th>
                <th className='p-2'>Status</th>
              </tr>
            </thead>
            <tbody className='bg-white'>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className='p-4 text-center text-gray-600'>
                    No receipts found
                  </td>
                </tr>
              )}
              {items.map((it: any) => (
                <tr key={it._id} className='border-b hover:bg-gray-200 cursor-pointer whitespace-nowrap' onClick={() => orderSummary(it)}>
                  <td className='p-2'>{it.invoice ?? "-"}</td>
                  <td className='p-2'>{it.poNumber ?? "-"}</td>
                  <td className='p-2 capitalize'>{it.supplier?.name?.toLowerCase() ?? "-"}</td>
                  <td className='p-2 text-right'>{formatCurrency(it.total)}</td>
                  <td className='p-2 text-center'>{formatDate(it.requestedAt)}</td>
                  <td className='p-2 text-center'>{formatDate(it.receivedAt)}</td>
                  <td className='p-2 capitalize'>{it.elaboratedBy?.firstName?.toLowerCase() ?? "-"} {it.elaboratedBy?.lastName?.toLowerCase() ?? "-"}</td>
                  <td className='p-2'><p className={it.supplierOrder?.status === `received` ? "p-2 text-center text-green-800 rounded-xl font-bold bg-green-400" : ""}>{(it.supplierOrder?.status ?? "-").toUpperCase()} </p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs font-bold sm:text-sm">
        <span className='hidden sm:block'>
          Showing {items.length} of {total} Supplier Receipts
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
      <SupplierReceiptSummaryModal
        open={showSummary}
        receipt={selectedReceipt}
        onClose={() => {
          setShowSummary(false);
          setSelectedReceipt(null);
        }}
        onEdit={(receipt) => {
          setShowSummary(false);
          setEditingReceipt(receipt);
        }} />
      <EditSupplierReceiptModal
        open={Boolean(editingReceipt)}
        receipt={editingReceipt}
        onClose={() => setEditingReceipt(null)}
        onSaved={() => {
          setEditingReceipt(null);
          setSelectedReceipt(null);
          setShowSummary(false);
          reload();
        }}
      />
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={""}
          onClose={() => setSubmitStatus(null)}
          collection='Supplier Receipts'
        />
      )}
    </div>
  );
}