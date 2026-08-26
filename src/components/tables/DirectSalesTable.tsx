"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useState, useEffect } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import DirectSaleDetailsModal from "../modals/DirectSaleDetailsModal";
import { DateTime } from "luxon";
import { formatCurrency } from "@/utils/format";
import CancelPreorderModal from "../modals/CancelPreorderModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import { SingleDatePicker } from "../ui/SingleDatePicker";

export function DirectSalesTable({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300 text-gray-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [fromDate, setFromDate] = useState(isAdmin ? () => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd") : "");
  const [toDate, setToDate] = useState(isAdmin ? () => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd") : "");
  const [creatorInput, setCreatorInput] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  
  // NEW: State for Checkboxes and Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [newDateInput, setNewDateInput] = useState(() => DateTime.now().setZone("America/Phoenix").toFormat("yyyy-MM-dd"));

  const [selectedDirectSale, setSelectedDirectSale] = useState<any>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
  const [message, setMessage] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedDirectSale2, setSelectedDirectSale2] = useState<any>(null);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users?limit=100")
        .then((res) => res.json())
        .then((data) => setVendors(data.items.filter((u: any) => u.userRole === "vendor")));
    }
  }, [isAdmin]);

  const { items, total, reload } = useList("/api/direct-sales", {
    page,
    search,
    limit,
    fromDate: fromDate,
    toDate: toDate,
    creatorId: creatorInput,
  });
  
  const formatDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : "-");
  const formatTime = (v?: string) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-");

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const handleSetPage = (value: string) => {
    setSubmitStatus("loading");
    if (value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
    setTimeout(() => setSubmitStatus(null), 1000);
  };

  const cancelDirectSale = async (reason: string) => {
    if (!selectedDirectSale2) {
      setSubmitStatus("error");
      setMessage("No Direct Sale selected");
      return;
    }

    setSubmitStatus("loading");
    try {
      const res = await fetch(`/api/direct-sales/${selectedDirectSale2._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Failed to cancel Direct Sale");
        setSubmitStatus("error");
        return;
      }
      const updated = await res.json();
      const idx = items.findIndex((i: any) => i._id === (updated._id));
      if (idx !== -1) items[idx] = updated;
      setSubmitStatus("success");
      setSelectedDirectSale(null);
      setSelectedDirectSale2(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    } finally {
      setCancelModalOpen(false);
      reload();
    }
  };

  // NEW: Function to handle Bulk Date Reassignment
  const submitReassignDate = async () => {
    setSubmitStatus("loading");
    setMessage("Updating dates...");
    try {
      const res = await fetch("/api/direct-sales/bulk-reassign-date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, newDate: newDateInput })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update dates");
      
      setSubmitStatus("success");
      setMessage("Dates updated successfully");
      setReassignModalOpen(false);
      setSelectedIds([]);
      reload(); // Refresh the table to show the new dates!
    } catch (err: any) {
      setSubmitStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className={`bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col ${isAdmin ? "w-[88vw] h-[80vh]" : "w-[90vw] h-[75vh]"}`}>

      {isAdmin && (
        <>
          <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
          <div className="flex w-full items-center justify-center pb-5">
            <div className="p-2 rounded-xl bg-white h-10 w-48 shadow-xl">
              <select
                value={creatorInput}
                onChange={(e) => setCreatorInput(e.target.value)}
                className="w-full h-full"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.firstName} {v.lastName}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between gap-5 mb-4">
        {isAdmin && (
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />)}
        <SearchBar placeholder="Search by number or status..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={reload} />
      </div>

      <div className="flex-1 overflow-auto rounded-xl shadow-xl bg-white">
        <table className="w-full text-left text-sm lg:text-md bg-white font-mono font-bold">
          <thead className="sticky top-0 bg-(--tertiary) z-10">
            <tr className="border-b">
              {isAdmin && (
                <th className="p-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && items.every((it: any) => selectedIds.includes(it._id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(items.map((it: any) => it._id));
                      else setSelectedIds([]);
                    }}
                    className="w-5 h-5 cursor-pointer"
                  />
                </th>
              )}
              <th className="p-2">Number #</th>
              <th className="p-2">Client</th>
              <th className="p-2 text-center">Total</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Route</th>
              <th className="p-2">Sold By</th>
              <th className="p-2 text-center">Creation Date</th>
              <th className="p-2 text-center">Creation Time</th>
              {isAdmin && (
                <>
                <th className="p-2 text-center">Cancelled Date</th>
                <th className="p-2 text-center">Cancelled Time</th>
                <th className="p-2 text-center">Cancelled By</th>
                </>
              )}
              <th className="p-2 text-center">Cancel</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-b whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedDirectSale(it)}>
                {isAdmin && (
                  <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(it._id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(prev => [...prev, it._id]);
                        else setSelectedIds(prev => prev.filter(id => id !== it._id));
                      }}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                )}
                <td className="p-2 font-mono font-bold text-blue-600">{it.number}</td>
                <td className="p-2 capitalize">{it.client?.clientName?.toLowerCase()}</td>
                <td className="p-2 font-semibold text-green-700 text-right">{formatCurrency(it.total)}</td>
                <td className="p-2 text-center">
                  <span className={`p-2 rounded-xl text-center text-xs font-bold uppercase ${statusColors[it.status]}`}>
                    {it.status}
                  </span>
                </td>
                <td className="p-2 text-center">{it.route?.code}</td>
                <td className="p-2 capitalize">
                  {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}
                </td>
                <td className="p-2 text-center">{formatDate(it.createdAt)}</td>
                <td className="p-2 text-center">{formatTime(it.createdAt)}</td>
                
                {isAdmin && (
                  it.status === "cancelled" ? (
                    <>
                      <td className="p-2 text-red-600 text-center">{formatDate(it.cancelledAt)}</td>
                      <td className="p-2 text-red-600 text-center">{formatTime(it.cancelledAt)}</td>
                      <td className="p-2 text-red-600 text-center capitalize">{it.cancelledBy?.firstName?.toLowerCase()} {it.cancelledBy?.lastName?.toLowerCase()}</td>
                    </>
                  ) : <td colSpan={3} className="p-2 text-center">-</td>
                )}

                {it.status !== "cancelled" && it.paymentStatus !== "paid" ? (
                  <td className="p-2 text-center">
                    <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:500'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDirectSale2(it);
                        setCancelModalOpen(true);
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </button>
                  </td>
                ) : <td className="p-2 text-center">-</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER ACTIONS & PAGINATION */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
        
        {/* Bulk Action Area */}
        <div className="w-full md:w-1/3">
           {isAdmin && selectedIds.length > 0 && (
              <button 
                onClick={() => setReassignModalOpen(true)}
                className="px-4 py-2 bg-blue-400 text-blue-900 rounded-xl shadow-xl font-bold hover:bg-blue-800 hover:text-white transition-all cursor-pointer"
              >
                Reassign Date ({selectedIds.length})
              </button>
           )}
        </div>

        {/* Pagination */}
        <div className="flex justify-end font-mono font-bold items-center gap-2">
          <span className={`${isAdmin ? "" : "text-xs"}`}>
            Showing {items.length} of {total} records
          </span>
          <button disabled={page === 1} onClick={() => handleSetPage("back")} className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page === 1 ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`${isAdmin ? "size-6": "size-4"}`}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <span className={`px-2 py-1 ${isAdmin ? "" : "text-xs"}`}>Page {page} of {totalPages || 1}</span>
          <button disabled={page >= totalPages} onClick={() => handleSetPage("forward")} className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`${isAdmin ? "size-6": "size-4"}`}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </button>
        </div>
      </div>

      {/* NEW: Reassign Date Modal */}
      {reassignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-center text-gray-800">Reassign Date</h2>
              <p className="text-gray-600 text-sm text-center">
                Select a new creation date for the <span className="font-bold text-blue-600">{selectedIds.length}</span> selected records.
              </p>

              <div className="h-12 w-full mt-2 mb-2">
                <SingleDatePicker 
                    value={newDateInput} 
                    onChange={setNewDateInput} 
                    reason="reassign" 
                />
              </div>
              
              <div className="flex gap-3 mt-2">
                 <button onClick={() => setReassignModalOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-colors cursor-pointer">Cancel</button>
                 <button onClick={submitReassignDate} disabled={!newDateInput} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">Confirm</button>
              </div>
           </div>
        </div>
      )}

      {selectedDirectSale && <DirectSaleDetailsModal userRole={isAdmin? "admin" : "not-allowed"} directSale={selectedDirectSale} onClose={() => setSelectedDirectSale(null)} />}
      
      {cancelModalOpen && selectedDirectSale2 && <CancelPreorderModal directSale={selectedDirectSale2} onClose={() => setCancelModalOpen(false)} onConfirm={cancelDirectSale} />}
      
      {submitStatus && <SubmitResultModal status={submitStatus} message={message} onClose={() => { setSubmitStatus(null); setMessage(""); setCancelModalOpen(false); }} collection="Direct Sale" />}
    </div>
  );
}