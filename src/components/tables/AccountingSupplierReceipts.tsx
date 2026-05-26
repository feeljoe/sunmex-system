"use client";
import { useList } from '@/utils/useList';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { useEffect, useState } from 'react';
import { SupplierReceiptSummaryModal } from "@/components/modals/SupplierReceiptSummaryModal";
import SubmitResultModal from '@/components/modals/SubmitResultModal';
import { DateRangePicker } from '../ui/DateRangePicker';

export function AccountingSupplierReceiptsTable() {
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Payment State
  const [paymentInputs, setPaymentInputs] = useState<Record<string, any>>({});

  const formatCurrency = (v?: number) => v != null ? `$${v.toFixed(2)}` : "-";
  const formatDate = (v?: string) => v ? new Date(v).toLocaleDateString() : "-";

  const { items, total, reload } = useList('/api/supplierReceipts', { page, limit, search, fromDate, toDate });
  
  useEffect(() => { setPage(1); }, [search, fromDate, toDate]);
  
  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);}, 3000);
  }, [reload]);
  
  const totalPages = total > 0 ? Math.ceil(total/limit) : 1;

  const orderSummary = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowSummary(true);
  }

  // --- NEW PAYMENT HANDLER ---
  const handlePay = async (receiptId: string, currentPayments: any[] = []) => {
    const input = paymentInputs[receiptId];
    if (!input || !input.amount || !input.method) return;

    const newPayments = [
      ...currentPayments,
      {
        type: input.method,
        amount: Number(input.amount),
        checkNumber: input.method === "check" ? input.checkNumber : undefined,
      },
    ];

    const res = await fetch(`/api/supplierReceipts/${receiptId}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments: newPayments }),
    });

    if (res.ok) {
      reload(); // Refresh the list
      setPaymentInputs(prev => ({ ...prev, [receiptId]: {} })); // Clear input
    } else {
      alert("Error saving payment");
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-200 text-green-800";
    if (status === "overdue") return "bg-red-200 text-red-800";
    return "bg-yellow-200 text-yellow-800";
  };

  return (
    <div className='bg-(--secondary) rounded-lg shadow-xl p-6 flex flex-col h-[75vh] w-[90vw]'>
      
      <div className="flex justify-between items-center gap-5 mb-4">
        <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
            }}
        />
        <SearchBar placeholder="Search Invoice / PO / Client Name ..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={() => {reload(); setSubmitStatus("loading");}}/>
      </div>

      <div className='flex-1 overflow-auto bg-white rounded-xl shadow-xl'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-gray-100 sticky top-0'>
            <tr className='border-b'>
              <th className='p-2 whitespace-nowrap'>Invoice / PO</th>
              <th className='p-2 whitespace-nowrap'>Supplier</th>
              <th className='p-2 whitespace-nowrap text-center'>Date Arrived</th>
              <th className='p-2 whitespace-nowrap text-right'>Total</th>
              <th className='p-2 whitespace-nowrap text-right'>Paid</th>
              <th className='p-2 whitespace-nowrap text-right'>Balance</th>
              <th className='p-2 whitespace-nowrap text-center'>Status</th>
              <th className='p-2 whitespace-nowrap text-center'>Payment Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} className='p-4 text-center text-gray-500'>No receipts found</td></tr>
            )}
            
            {items.map((it: any) => {
              // Calculate specific row values
              const paidAmount = it.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
              const balance = Math.max(it.total - paidAmount, 0);
              const currentStatus = it.paymentStatus || "pending";

              return (
                <tr key={it._id} className='border-b hover:bg-gray-50 cursor-pointer transition-colors' onClick={() => orderSummary(it)}>
                  <td className='p-2 whitespace-nowrap font-bold'>
                    {it.invoice} <span className="text-gray-400 font-normal">| {it.poNumber}</span>
                  </td>
                  <td className='p-2 whitespace-nowrap capitalize'>{it.supplier?.name.toLowerCase()}</td>
                  <td className='p-2 whitespace-nowrap text-center'>{formatDate(it.receivedAt)}</td>
                  <td className='p-2 whitespace-nowrap text-right'>{formatCurrency(it.total)}</td>
                  <td className='p-2 whitespace-nowrap text-right text-green-600'>{formatCurrency(paidAmount)}</td>
                  <td className='p-2 whitespace-nowrap text-right font-bold text-red-600'>{formatCurrency(balance)}</td>
                  <td className='p-2 whitespace-nowrap text-center'>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(currentStatus)}`}>
                      {currentStatus.toUpperCase()}
                    </span>
                  </td>
                  
                  {/* PAYMENT COLUMN */}
                  <td className='p-2 min-w-[300px]' onClick={(e) => e.stopPropagation()}>
                    {currentStatus === "paid" ? (
                      <div className="text-xs text-gray-500 text-center">
                        {it.payments?.map((p: any, idx: number) => (
                          <div key={idx}>
                            {p.type.toUpperCase()} - {formatCurrency(p.amount)} {p.checkNumber ? `(#${p.checkNumber})` : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center justify-center">
                        <select
                          value={paymentInputs[it._id]?.method || ""}
                          onChange={(e) => setPaymentInputs(prev => ({ ...prev, [it._id]: { ...prev[it._id], method: e.target.value } }))}
                          className="border rounded-xl px-2 h-8 text-xs"
                        >
                          <option value="">Type</option>
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                          <option value="transfer">Transfer</option>
                        </select>
                        
                        <input
                          type="number"
                          placeholder="Amount"
                          value={paymentInputs[it._id]?.amount || ""}
                          onChange={(e) => setPaymentInputs(prev => ({ ...prev, [it._id]: { ...prev[it._id], amount: e.target.value } }))}
                          className="border rounded-xl px-2 w-20 h-8 text-xs"
                        />
                        
                        {paymentInputs[it._id]?.method === "check" && (
                          <input
                            type="text"
                            placeholder="Check #"
                            value={paymentInputs[it._id]?.checkNumber || ""}
                            onChange={(e) => setPaymentInputs(prev => ({ ...prev, [it._id]: { ...prev[it._id], checkNumber: e.target.value } }))}
                            className="border rounded-xl px-2 w-20 h-8 text-xs"
                          />
                        )}
                        
                        <button
                          onClick={() => handlePay(it._id, it.payments)}
                          className="bg-green-500 text-white px-3 h-8 rounded-xl hover:bg-green-400 transition-colors text-xs font-bold"
                        >
                          Pay
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center gap-4 mt-4">
        <span className='mt-1'>Showing {items.length} of {total} receipts</span>
        <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-(--quarteary) text-white rounded-xl shadow-xl disabled:opacity-50">Prev</button>
        <span className="px-3 py-1">Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50">Next</button>
      </div>

      <SupplierReceiptSummaryModal open={showSummary} receipt={selectedReceipt} onClose={() => { setShowSummary(false); setSelectedReceipt(null); }}/>
      
      {submitStatus && (
        <SubmitResultModal status={submitStatus} message={""} onClose={() => setSubmitStatus(null)} collection='Supplier Receipts' />
      )}
    </div>
  );
}