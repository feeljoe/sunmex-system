"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useState, useEffect } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";

export function DirectSalesTable({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  // Status Colors (Matching your Preorders Table)
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    delivered: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorInput, setCreatorInput] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);

  // Fetch list of users for the filter dropdown (Admin only)
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
    fromDate: fromDate,
    toDate: toDate,
    creatorId: creatorInput,
  });

  const formatCurrency = (v?: number) => (v != null ? `$${v.toFixed(2)}` : "-");
  const formatDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : "-");
  const formatTime = (v?: string) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-");

  const totalPages = total > 0 ? Math.ceil(total / 25) : 1;

  return (
    <div className={`bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-[75vh] ${isAdmin ? "w-[90vw]" : "w-[97vw]"}`}>
      
      {/* ADMIN FILTERS SECTION */}
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

      {/* SEARCH & REFRESH */}
      <div className="flex justify-between gap-5 mb-4">
        <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
            }}
        />
        <SearchBar placeholder="Search by number or status..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={reload} />
      </div>

      {/* THE TABLE */}
      <div className="flex-1 overflow-auto border-t">
        <table className="w-full text-left text-sm lg:text-md">
          <thead className="sticky top-0 bg-(--secondary) z-10">
            <tr className="border-b">
              <th className="p-3">Number #</th>
              <th className="p-3">Client</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Route</th>
              <th className="p-3">Sold By</th>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-3 font-mono font-bold text-blue-600">{it.number}</td>
                <td className="p-3 capitalize">{it.client?.clientName?.toLowerCase()}</td>
                <td className="p-3 font-semibold text-green-700">{formatCurrency(it.total)}</td>
                <td className="p-3">
                  <div className={`px-2 py-1 rounded-lg text-center text-xs font-bold uppercase ${statusColors[it.status]}`}>
                    {it.status}
                  </div>
                </td>
                <td className="p-3">{it.route?.code}</td>
                <td className="p-3 capitalize">
                    {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}
                </td>
                <td className="p-3">{formatDate(it.createdAt)}</td>
                <td className="p-3 text-gray-500">{formatTime(it.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION (Matching Preorders style) */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm">Showing {items.length} of {total}</span>
        <div className="flex gap-2 items-center">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="p-1 bg-(--quarteary) text-white rounded-lg disabled:opacity-50"
          >
            {/* Left Arrow SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <span className="text-sm font-medium">Page {page} of {totalPages}</span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="p-1 bg-(--quarteary) text-white rounded-lg disabled:opacity-50"
          >
            {/* Right Arrow SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}