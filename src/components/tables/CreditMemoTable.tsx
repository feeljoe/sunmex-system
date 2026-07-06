"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import CancelCreditMemoModal from "../modals/CancelCreditMemoModal";
import CreditMemoDetailsModal from "../modals/CreditMemoDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import AssignRouteModal from "../modals/AssignRouteModal";
import { DateTime } from "luxon";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";

export function CreditMemosTable({ userRole, userId }: { userRole: string; userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    received: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };

  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignRouteModalOpen, setAssignRouteModalOpen] = useState(false);
  const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const todayISO = () => new Date().toISOString().split("T")[0];
  const today = todayISO();

  const [fromDate, setFromDate] = useState(userRole === "vendor" ? today : () => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [toDate, setToDate] = useState(userRole === "vendor" ? today : () => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate,
    toDate,
    vendorId: userRole === "vendor" ? userId : "",
    routeId: "",
  });

  // Data for selects
  const [vendors, setVendors] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Fetch users for selects
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        const data = await res.json();
        if(res.ok){
          setVendors(data.items.filter((u: any) => u.userRole === "vendor"));
        }
      } catch(err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch routes for select (assuming /api/routes)
    useEffect(() => {
      const fetchRoutes = async () => {
        try {
          const res = await fetch("/api/routes?limit=100");
          const data = await res.json();
          if(res.ok){
            setRoutes(data.items.filter((u: any) => u.type === "driver"));
            setVendors(data.items.filter((u: any) => u.type === "vendor"));
          }
        } catch(err) {
          console.error("Failed to fetch routes:", err);
        }
      };
      fetchRoutes();
    }, []);
    
  const { items, total, reload } = useList("/api/credit-memos", {
    page,
    limit,
    search,
    fromDate: fromDate,
    toDate: toDate,
    vendorId: vendorInput,
    routeId: routeInput,
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const formatDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : "-");
  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const cancelCreditMemo = async (reason: string) => {
    if (!cancelTarget) return;

    setSubmitStatus("loading");
    try {
      const res = await fetch(`/api/credit-memos/${cancelTarget._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          cancelReason: reason,
          cancelledBy: userId,
        }),
      });

      if (!res.ok) throw new Error("Failed to cancel credit memo");

      const updated = await res.json();
      const idx = items.findIndex((i: any) => i._id === updated._id);
      if (idx !== -1) items[idx] = updated;

      setSubmitStatus("success");
      setCancelTarget(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleFilters = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if(newFilters[key] === value){
        delete newFilters[key];
      }else {
        newFilters[key] = value;
      }

      const searchString = Object.entries(newFilters)
      .map(([k,v]) => ( v ? `${k}:${v}` : ""))
      .filter(Boolean)
      .join(" ");

      setSearch(searchString);
      return newFilters;
    });
  };

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const filterOptions = [
    { label: "Pending", key: "status", value: "pending" },
    { label: "Received", key: "status", value: "received" },
    { label: "Cancelled", key: "status", value: "cancelled" },
    { label: "Total", key: "total", value: "" },
    { label: "Subtotal", key: "subtotal", value: "" },
  ];

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };
  

  return (
    <div className={`h-[75vh] font-mono ${userRole === "admin" ? "w-[90vw]" : "w-[95vw]"}`}>
    <div className="flex items-center justify-end py-2">
    <Link href="/pages/sales/creditmemo/add-creditmemo">
    <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
                Make Credit Memo
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
            </button>
            </Link>
    </div>
    <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-5'>
      {userRole === "admin" && (
        <>
        <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
        <div className="flex w-full items-center gap-5 mb-5">
      {/* VENDOR */}
      <select
        value={vendorInput}
        onChange={(e) => setVendorInput(e.target.value)}
        className="p-2 rounded-xl bg-white h-10"
      >
        <option value="">All Vendors</option>
        {vendors.map(v => <option key={v._id} value={v.user?._id}>{v.code} - {v.user?.firstName} {v.user?.lastName}</option>)}
      </select>

      {/* ROUTE */}
      <select
        value={routeInput}
        onChange={(e) => {
          setRouteInput(e.target.value);
        }}
        className="p-2 rounded bg-white h-10"
      >
        <option value="">All Routes</option>
        {routes.map(r => <option key={r._id} value={r._id}>{r.code} - {r.user?.firstName} {r.user?.lastName}</option>)}
      </select>
      </div>
      </>
      )}
      <div className="flex justify-between mb-4 gap-5">
      {userRole === "admin" && (
        <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
          )}
        <SearchBar placeholder="Search credit memos..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={() => {
          setSubmitStatus("loading");
          reload();
          setTimeout(() => setSubmitStatus(null), 3000);
          }} />
      </div>
      {userRole === "admin" && (
      <div className="flex flex-wrap gap-2 mb-3">

        {filterOptions.map((f)=>{
          const isActive = f.key === "total" || f.key === "subtotal"
          ? !!activeFilters[f.key]
          : activeFilters[f.key] === f.value;
          const isInputActive = activeInput === f.key;

          if(f.key === "total" || f.key === "subtotal"){
            return (
              <div key={f.key} className="flex items-center gap-2">
                {!isInputActive ? (
                  <button
                    onClick={() => {
                      if(isActive) {
                        setActiveFilters((prev) => {
                          const copy = { ...prev };
                          delete copy[f.key];
                          const searchString = Object.entries(copy)
                          .map(([k, v]) => (v ? `${k}:${v}`: ""))
                          .filter(Boolean)
                          .join(" ");
                          setSearch(searchString);
                          return copy;
                        });
                      }else {
                        setActiveInput(f.key);
                        setTempValue("");
                      }
                    }}
                    className={`
                      px-2 py-1 rounded-xl shadow-xl transition-all duration:300
                      ${isActive ? "bg-(--tertiary) text-white": "bg-white hover:bg-gray-100"}
                    `}
                    >
                      {isActive ? `${f.label}:${activeFilters[f.key]}`: f.label}
                    </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      inputMode="decimal"
                      step= "0.01"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="px-2 py-1 rounded-xl bg-white shadow-xl w-24"
                      placeholder="value"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if(tempValue) {
                          setActiveFilters((prev) => {
                            const copy = { ...prev, [f.key]: tempValue};
                            const searchString = Object.entries(copy)
                              .map(([k, v]) => (v ? `${k}:${v}` : ""))
                              .filter(Boolean)
                              .join(" ");
                            setSearch(searchString);
                            return copy;
                          });
                          }
                          setActiveInput(null);
                          setTempValue("");
                        }}
                      className="px-2 py-1 rounded-xl bg-blue-500 text-white cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setActiveInput(null);
                          setTempValue("");
                        }}
                        className="px-2 py-1 rounded-xl bg-gray-300 text-black cursor-pointer"
                      >
                        Cancel
                      </button>
                  </div>
                )}
                
              </div>
            );
          }
          return (
            <button
              key={f.label}
              onClick={() => toggleFilters(f.key, f.value)}
              className={`
                px-2 py-1 rounded-xl shadow-xl transition-all duration-200

                ${isActive
                  ? "bg-(--tertiary) text-white"
                  : "bg-white hover:bg-gray-100"}
              `}
            >
              {f.label}</button>
          );
        })}

      </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-xl">
        <table className="text-left text-sm">
          <thead className="bg-(--tertiary) sticky top-0">
            <tr className="border-b">
            {userRole === "admin" && (
              <>
                <th className="p-2">
                  <input
                    type="checkbox"
                    checked={
                      items.length > 0 &&
                      items.every((it: any) => selectedIds.includes(it._id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const selectable = items
                          .filter((it: any) => it.status === "pending")
                          .map((it: any) => it._id);

                        setSelectedIds(selectable);
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="h-5 w-5"
                  />
                </th>

                <th className="p-2">Assign Route</th>
              </>
              )}
              <th className="p-2">Number #</th>
              <th className="p-2">Client</th>
              <th className="p-2">Subtotal</th>
              <th className="p-2">Total</th>
              <th className="p-2">Status</th>
              {userRole === "admin" && (
                <>
                  <th className="p-2">Created By</th>
                  <th className="p-2">Created Date</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Returned By</th>
                  <th className="p-2">Returned Date</th>
                  <th className="p-2">Returned At</th>
                </>
              )}
              <th className="p-2">Cancel</th>
              {userRole === "admin" && (
                <>
                  <th className="p-2">Cancelled Date</th>
                  <th className="p-2">Cancelled At</th>
                  <th className="p-2">Cancelled By</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="bg-white">
            {items.map((it: any) => (
              <tr
                key={it._id}
                className={`border-b hover:bg-gray-50 cursor-pointer whitespace-nowrap font-bold ${it.status==="cancelled"? "text-red-500": ""}`}
                onClick={() => setSelected(it)}
              >
                {userRole === "admin" && it.status === "pending" && (
                  <>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(it._id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, it._id]);
                          } else {
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== it._id)
                            );
                          }
                        }}
                        className="h-5 w-5 cursor-pointer"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <button
                        className="bg-blue-400 text-blue-800 hover:text-white p-2 rounded-xl cursor-pointer hover:bg-blue-800 transition-all duration:300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCreditMemo(it);
                          setSelectedClient(it.client);
                          setAssignRouteModalOpen(true);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                      </svg>
                      </button>
                    </td>
                  </>
                )}
                {userRole === "admin" && it.status !== "pending" && (
                  <>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                  </>
                )}
                <td className="p-2">{it.number}</td>
                <td className="p-2 capitalize">{it.client?.clientName?.toLowerCase()}</td>
                <td className="p-2">{formatCurrency(it.subtotal)}</td>
                <td className="p-2">{formatCurrency(it.total)}</td>
                <td className="p-2">
                  <div className={`p-1 rounded-xl text-center ${statusColors[it.status]}`}>
                    {it.status.toUpperCase()}
                  </div>
                </td>

                {userRole === "admin" && (
                  <>
                    <td className="p-2 capitalize">
                      {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}
                    </td>
                    <td className="p-2">{formatDate(it.createdAt)}</td>
                    <td className="p-2">{formatTime(it.createdAt)}</td>
                    {it.routeAssigned &&
                      <td className="p-2 capitalize">
                        {it.status === "received" ? (
                        <>
                          {it.routeAssigned?.code} | {it.returnedBy?.firstName?.toLowerCase()} {it.returnedBy?.lastName?.toLowerCase()}
                        </>
                      ) : (
                        <>
                          {it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName?.toLowerCase()} {it.routeAssigned?.user?.lastName?.toLowerCase()}
                        </>
                      )}
                      </td>
                    }
                    {(it.routeAssigned === undefined) &&
                      <td className="p-2 capitalize"> 001 | {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()} </td>
                    }
                    <td className="p-2">{formatDate(it.returnedAt)}</td>
                    <td className="p-2">{formatTime(it.returnedAt)}</td>
                  </>
                )}

                {it.warehouseStatus === "pending" ? (
                  <td className="p-2">
                    <button
                      className="bg-red-400 text-red-800 hover:text-white hover:bg-red-800 p-2 rounded-xl cursor-pointer transition-colors duration:300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget(it);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  </td>
                ) : (
                  <td className="p-2 text-center whitespace-nowrap">-</td>
                )}
                  {userRole === "admin" && it.canceledAt ? (
                    <>
                    <td className="p-2 text-center">{formatDate(it.cancelledAt)}</td>
                    <td className="p-2 text-center">{formatTime(it.cancelledAt)}</td>
                      <td className="p-2 capitalize">
                        {it.cancelledBy?.firstName?.toLowerCase()} {it.cancelledBy?.lastName?.toLowerCase()}
                      </td>
                      </>
                    ) : (
                      <td colSpan={3} className="p-2 text-center">-</td>
                    )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center w-full">
        <div>
      {userRole === "admin" && selectedIds.length > 0 && (
          <button
            onClick={() => {
              setSelectedCreditMemo(null);
              setAssignRouteModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-xl"
          >
            Assign {selectedIds.length} Selected
          </button>
        )}
        </div>
        <div className="flex font-mono font-bold items-center gap-4 mt-2">
        <span>
          Showing {items.length} of {total} Preorders
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

      {selected && (
        <CreditMemoDetailsModal
          creditMemo={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {cancelTarget && (
        <CancelCreditMemoModal
          creditMemo={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={cancelCreditMemo}
        />
      )}

      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
            setMessage("");
          }}
          collection="Credit Memo"
        />
      )}
      {assignRouteModalOpen && (
        <AssignRouteModal
          bulkMode={selectedIds.length > 0}
          creditMemoIds={selectedIds.length > 0 ? selectedIds : undefined}
          creditMemoId={selectedCreditMemo?._id}
          clientName={selectedClient?.clientName ?? ""}
          currentRouteId={selectedCreditMemo?.routeAssigned?._id ?? selectedCreditMemo?.routeAssigned}
          onClose={() => {
            setAssignRouteModalOpen(false);
            setSelectedIds([]);
          }}
          onAssigned={() => {
            reload();
            setSelectedIds([]);
          }}
        />
      )}
    </div>
    </div>
  );
}
