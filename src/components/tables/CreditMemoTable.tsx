"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import CancelCreditMemoModal from "../modals/CancelCreditMemoModal";
import CreditMemoDetailsModal from "../modals/CreditMemoDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";

export function CreditMemosTable({ userRole, userId }: { userRole: string; userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    received: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const todayISO = () => new Date().toISOString().split("T")[0];
  const today = todayISO();

  const [fromDate, setFromDate] = useState(userRole === "vendor" ? today : "");
  const [toDate, setToDate] = useState(userRole === "vendor" ? today : "");
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
    fromDate: appliedFilters.fromDate,
    toDate: appliedFilters.toDate,
    vendorId: appliedFilters.vendorId,
    routeId: appliedFilters.routeId,
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const formatCurrency = (v?: number) => (v != null ? `$${v.toFixed(2)}` : "-");
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
      const res = await fetch(`/api/credit-memos/${cancelTarget._id}`, {
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

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      fromDate,
      toDate,
      vendorId: vendorInput,
      routeId: routeInput,
    });
  }

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

  return (
    <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
      {userRole === "admin" && (
        <>
        <div className="flex items-center mb-4">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
        </div>
        <div className="grid grid-cols lg:grid-cols-3 gap-4 mb-4">
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
        onChange={(e) => setRouteInput(e.target.value)}
        className="p-2 rounded bg-white h-10"
      >
        <option value="">All Routes</option>
        {routes.map(r => <option key={r._id} value={r._id}>{r.code} - {r.user?.firstName} {r.user?.lastName}</option>)}
      </select>
      {/* FILTER BUTTON */}
      <div className="flex mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-xl"
          onClick={applyFilters}
        >
          Apply Filters
        </button>
      </div>
      </div>
      </>
      )}
      <div className="flex justify-between mb-4 gap-5">
        <SearchBar placeholder="Search credit memos..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={reload} />
      </div>
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
                      px-3 py-1 rounded-xl shadow-xl transition-all duration:300
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
                      className="px-3 px-1 rounded-xl bg-blue-500 text-white cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setActiveInput(null);
                          setTempValue("");
                        }}
                        className="px-3 py-1 rounded-xl bg-gray-300 text-black cursor-pointer"
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
                px-3 py-1 rounded-xl shadow-xl transition-all duration-200

                ${isActive
                  ? "bg-(--tertiary) text-white"
                  : "bg-white hover:bg-gray-100"}
              `}
            >
              {f.label}</button>
          );
        })}

      </div>

      <div className="flex-1 overflow-auto">
        <table className="text-left lg:text-lg">
          <thead>
            <tr className="border-b">
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
                  <th className="p-2">Cancelled By</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((it: any) => (
              <tr
                key={it._id}
                className="border-b hover:bg-gray-50 cursor-pointer text-sm"
                onClick={() => setSelected(it)}
              >
                <td className="p-2 whitespace-nowrap">{it.number}</td>
                <td className="p-2 whitespace-nowrap capitalize">{it.client?.clientName.toLowerCase()}</td>
                <td className="p-2 whitespace-nowrap">{formatCurrency(it.subtotal)}</td>
                <td className="p-2 whitespace-nowrap">{formatCurrency(it.total)}</td>
                <td className="p-2 whitespace-nowrap">
                  <div className={`px-2 py-2 rounded-xl text-center whitespace-nowrap ${statusColors[it.status]}`}>
                    {it.status.toUpperCase()}
                  </div>
                </td>

                {userRole === "admin" && (
                  <>
                    <td className="p-2 whitespace-nowrap capitalize">
                      {it.createdBy?.firstName.toLowerCase()} {it.createdBy?.lastName.toLowerCase()}
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatDate(it.createdAt)}</td>
                    <td className="p-2 whitespace-nowrap">{formatTime(it.createdAt)}</td>
                    {it.routeAssigned &&
                      <td className="p-2 whitespace-nowrap capitalize">{it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName.toLowerCase() } {it.routeAssigned?.user?.lastName.toLowerCase()} </td>
                    }
                    {(it.routeAssigned === undefined) &&
                      <td className="p-2 whitespace-nowrap capitalize"> 001 | {it.createdBy?.firstName.toLowerCase()} {it.createdBy?.lastName.toLowerCase()} </td>
                    }
                    <td className="p-2 whitespace-nowrap">{formatDate(it.returnedAt)}</td>
                    <td className="p-2 whitespace-nowrap">{formatTime(it.returnedAt)}</td>
                  </>
                )}

                {it.status === "pending" ? (
                  <td className="p-2 whitespace-nowrap">
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget(it);
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                ) : (
                  <td className="p-2 text-center whitespace-nowrap">-</td>
                )}

                {userRole === "admin" && (
                  <>
                    <td className="p-2 text-red-500 whitespace-nowrap">{formatDate(it.cancelledAt)}</td>
                    <td className="p-2 text-red-500 whitespace-nowrap capitalize">
                      {it.cancelledBy?.firstName.toLowerCase()} {it.cancelledBy?.lastName.toLowerCase()}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>◀</button>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>▶</button>
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
    </div>
  );
}
