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

export function DirectSalesTable({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  // Status Colors (Matching your Preorders Table)
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
  const [selectedDirectSale, setSelectedDirectSale] = useState<any>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
  const [message, setMessage] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedDirectSale2, setSelectedDirectSale2] = useState<any>(null);

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
  };

  // ----------------------------------------------------
  // EXPORT EXCEL LOGIC
  // ----------------------------------------------------
  const handleExportExcel = async () => {
    try {
      setSubmitStatus("loading");
      setMessage("Generating Excel file...");

      const res = await fetch("/api/direct-sale/export");
      if (!res.ok) throw new Error("Export failed");

      // Get the binary Excel buffer from the API
      const blob = await res.blob();

      // Trigger the browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSubmitStatus("success");
      setMessage("Export completed!");

    } catch (err) {
      console.error(err);
      setSubmitStatus("error");
      setMessage("Failed to export products.");
    }
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

      {/* THE TABLE */}
      <div className="flex-1 overflow-auto rounded-xl shadow-xl bg-white">
        <table className="w-full text-left text-sm lg:text-md bg-white font-mono font-bold">
          <thead className="sticky top-0 bg-(--tertiary) z-10">
            <tr className="border-b">
              <th className="p-2">Number #</th>
              <th className="p-2">Client</th>
              <th className="p-2 text-center">Total</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Route</th>
              <th className="p-2">Sold By</th>
              <th className="p-2 text-center">Delivery Date</th>
              <th className="p-2 text-center">Delivery Time</th>
              <th className="p-2 text-center">Cancelled Date</th>
              <th className="p-2 text-center">Cancelled Time</th>
              <th className="p-2 text-center">Cancelled By</th>
              <th className="p-2 text-center">Cancel</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedDirectSale(it)}>
                <td className="p-2 font-mono font-bold text-blue-600">{it.number}</td>
                <td className="p-2 capitalize">{it.client?.clientName?.toLowerCase()}</td>
                <td className="p-2 font-semibold text-green-700 text-right">{formatCurrency(it.total)}</td>
                <td className="p-2 flex justify-center">
                  <span className={`py-1 w-30 rounded-xl text-center text-xs font-bold uppercase ${statusColors[it.status]}`}>
                    {it.status}
                  </span>
                </td>
                <td className="p-2 text-center">{it.route?.code}</td>
                <td className="p-2 capitalize">
                  {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}
                </td>
                <td className="p-2 text-center">{formatDate(it.createdAt)}</td>
                <td className="p-2 text-center">{formatTime(it.createdAt)}</td>
                {isAdmin && it.status === "cancelled" ? (
                  <td className="p-2 text-red-600 text-center" onClick={() => setSelectedDirectSale(it)}>{formatDate(it.cancelledAt)}</td>
                ) : (
                  <td colSpan={3} className="p-2 text-center">-</td>
                )}
                {isAdmin && it.status === "cancelled" && (
                  <td className="p-2 text-red-600 text-center" onClick={() => setSelectedDirectSale(it)}>{formatTime(it.cancelledAt)}</td>
                )}
                {isAdmin && it.status === "cancelled" && (
                  <td className="p-2 text-red-600 text-center capitalize" onClick={() => setSelectedDirectSale(it)}>{it.cancelledBy?.firstName?.toLowerCase()} {it.cancelledBy?.lastName?.toLowerCase()}</td>
                )}
                {it.status !== "cancelled" && it.paymentStatus !== "paid" ? (
                  <td className="p-2 text-center">
                    <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:500'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDirectSale2(it);
                        setCancelModalOpen(true);
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  </td>
                ) : (
                  <td className="p-2 text-center">-</td>
                )
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className='flex justify-between items-center font-mono'>
        <div className='flex mt-4'>
          <button
            onClick={handleExportExcel}
            className='flex gap-3 p-2 font-bold rounded-xl bg-green-400 text-green-800 hover:bg-green-800 hover:text-white transition-all duration:300 cursor-pointer items-center'
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Export
          </button>
        </div>
        <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
          <span>
            Showing {items.length} of {total} products
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
              handleSetPage("forward");
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
      {selectedDirectSale &&
        <DirectSaleDetailsModal
          directSale={selectedDirectSale}
          onClose={() => setSelectedDirectSale(null)}
        />
      }
      {cancelModalOpen && selectedDirectSale2 && (
        <CancelPreorderModal
          preorder={selectedDirectSale2}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={cancelDirectSale}
        />
      )}
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
            setMessage("");
            setCancelModalOpen(false);
          }}
          collection="Direct Sale"
        />
      )}
    </div>
  );
}