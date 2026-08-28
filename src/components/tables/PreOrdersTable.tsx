"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useMemo, useState } from "react";
import AssignRouteModal from "../modals/AssignRouteModal";
import CancelPreorderModal from "../modals/CancelPreorderModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import PreorderDetailsModal from "../modals/PreorderDetailsModal";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import PreorderWizard from "../forms/AddPreorderWizard/PreorderWizard";
import { DateTime } from "luxon";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { useSidebar } from "@/app/components/SideBarContext";

export function PreordersTable({ userRole, userId }: { userRole: string, userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    assigned: "bg-(--tertiary) text-(--quarteary)",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };
  const { sidebarOpen } = useSidebar();

  const ITEMS_PER_PAGE = 100;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // API Fetch State Tracker
  const [apiDates, setApiDates] = useState({
    from: userRole === "vendor" ? new Date().toISOString().split("T")[0] : DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"),
    to: userRole === "vendor" ? new Date().toISOString().split("T")[0] : DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd")
  });

  // Draft State for Date Picker
  const [draftFrom, setDraftFrom] = useState(apiDates.from);
  const [draftTo, setDraftTo] = useState(apiDates.to);

  const [localItems, setLocalItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [vendors, setVendors] = useState<any[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        const data = await res.json();
        if (res.ok) {
          setVendors(data.items.filter((u: any) => u.userRole === "vendor"));
          setWarehouseUsers(data.items.filter((u: any) => u.userRole === "warehouse"));
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch("/api/routes?limit=100");
        const data = await res.json();
        if (res.ok) {
          setRoutes(data.items.filter((u: any) => u.type === "driver"));
          setVendors(data.items.filter((u: any) => u.type === "vendor"));
        }
      } catch (err) {
        console.error("Failed to fetch routes:", err);
      }
    };
    fetchRoutes();
  }, []);

  // API Call - Only triggered when apiDates change or reload() is called
  const { items: fetchedItems, reload, loading } = useList("/api/preOrders", {
    fromDate: apiDates.from,
    toDate: apiDates.to,
    vendorId: userRole === "vendor" ? userId : undefined,
  });

  useEffect(() => {
    if (fetchedItems) setLocalItems(fetchedItems);
  }, [fetchedItems]);

  const [assignRouteModalOpen, setAssignRouteModalOpen] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [selectedPreorder2, setSelectedPreorder2] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [editingPreorder, setEditingPreorder] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Snappy Loading Modal Logic
  useEffect(() => {
    if (loading) {
      setSubmitStatus("loading");
      setMessage("Loading Data...");
    } else {
      const timer = setTimeout(() => {
        setSubmitStatus((prev) => {
          if (prev === "loading") {
            setMessage("");
            return null;
          }
          return prev;
        });
      }, 500); // 0.5s delay guarantees the user sees the snappy animation
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const [isLocationHovered, setIsLocationHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => setIsLocationHovered(true), 300);
    setHoverTimeout(timeout);
  };
  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsLocationHovered(false);
  };

  const formatDate = (v?: string) => v ? new Date(v).toLocaleDateString() : "-";
  const formatTime = (v?: string) => v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

  const cancelPreorder = async (reason: string) => {
    if (!selectedPreorder2) return;
    setSubmitStatus("loading");
    setMessage("Cancelling Preorder...");
    try {
      const res = await fetch(`/api/preOrders/${selectedPreorder2._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Failed to cancel preorder");
        setSubmitStatus("error");
        return;
      }
      const updated = await res.json();

      // OPTIMISTIC UPDATE: Instant UI refresh
      setLocalItems(prev => prev.map(item => item._id === updated._id ? updated : item));

      setSubmitStatus("success");
      setMessage("Preorder Cancelled Successfully");
      setSelectedPreorder(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    } finally {
      setCancelModalOpen(false);
    }
  };

  const toggleFilters = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[key] === value) delete newFilters[key];
      else newFilters[key] = value;
      return newFilters;
    });
    setPage(1);
  };

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const filterOptions = [
    { label: "Pending", key: "status", value: "pending" },
    { label: "Assigned", key: "status", value: "assigned" },
    { label: "Ready", key: "status", value: "ready" },
    { label: "Delivered", key: "status", value: "delivered" },
    { label: "Cancelled", key: "status", value: "cancelled" },
    { label: "Payment Pending", key: "payment", value: "pending" },
    { label: "Paid", key: "payment", value: "paid" },
    { label: "Total", key: "total", value: "" },
    { label: "Subtotal", key: "subtotal", value: "" },
  ];

  // --------------------------------------------------
  // CLIENT-SIDE FILTERING ENGINE (INSTANT)
  // --------------------------------------------------
  const filteredItems = useMemo(() => {
    let result = [...localItems];

    if (vendorInput) result = result.filter(o => o.createdBy?._id === vendorInput);
    if (routeInput) result = result.filter(o => o.routeAssigned?._id === routeInput);
    if (warehouseInput) result = result.filter(o => o.assembledBy?._id === warehouseInput);

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (key === "status") result = result.filter(o => o.status === value);
      if (key === "payment") result = result.filter(o => o.paymentStatus === value);
      if (key === "total") result = result.filter(o => o.total === Number(value));
      if (key === "subtotal") result = result.filter(o => o.subtotal === Number(value));
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(o =>
        o.number?.toLowerCase().includes(lowerSearch) ||
        o.client?.clientName?.toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }, [localItems, vendorInput, routeInput, warehouseInput, activeFilters, search]);

  const totalPages = filteredItems.length > 0 ? Math.ceil(filteredItems.length / ITEMS_PER_PAGE) : 1;
  const paginatedItems = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSetPage = (value: string) => {
    if (value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  const exportForRoutes = async () => {
    setSubmitStatus("loading");
    setMessage("Exporting...");
    try {
      const res = await fetch("/api/preOrders/for-routes");
      if (!res.ok) {
        setMessage("Failed to export");
        setSubmitStatus("error");
        return;
      }
      setMessage("Export complete");
      setSubmitStatus("success");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "preorders-for-routes.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? "md:w-[89vw]" : "md:w-[96vw]"} w-[96vw] h-[75vh] md:h-[86vh]`}>
      <div className="flex items-center justify-end py-2">
        <Link href="/pages/sales/preorders/add-preorder">
          <button className="flex gap-2 p-2 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
            Make Pre Order
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
        </Link>
      </div>
      <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-2 overflow-auto'>
        {userRole === "admin" &&
          <>
          <div className="flex flex-col items-center md:flex-row md:justify-between mb-4 gap-2">
          {userRole === "admin" && (
            <div className="flex w-full md:w-auto bg-white rounded-xl justify-center shadow-xl">
              <DateRangePicker
                fromDate={draftFrom}
                toDate={draftTo}
                onChange={(from, to) => {
                  setDraftFrom(from);
                  setDraftTo(to);
                  // ONLY fire the API if 'to' is valid and it actually changed!
                  if (to && (from !== apiDates.from || to !== apiDates.to)) {
                    setApiDates({ from, to });
                    setPage(1);
                  }
                }}
              />
            </div>
          )}
          <div className="flex gap-2 w-full">
            <SearchBar
              placeholder="Search by client or number..."
              onSearch={(val) => {
                if (val !== search) { setSearch(val); setPage(1); }
              }}
              debounce
            />
            <RefreshButton onRefresh={() => reload()} />
          </div>
        
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`cursor-pointer flex gap-2 p-2 ${showFilters ? "bg-yellow-400 text-yellow-800" : "bg-yellow-800 text-white"} hover:bg-yellow-800 hover:text-white rounded-xl text-xl font-bold transition-colors duration:300`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5 md:size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                <span className="text-sm md:text-[16px] whitespace-nowrap">{showFilters ? "Hide Filters" : "Show Filters"}</span>
              </button>
            </div>
            {showFilters && (
              <>
                <div className="flex flex-col md:flex-row justify-between gap-2 mb-2 md:h-10 md:flex-wrap">
                  {/* SAFE CHANGE HANDLERS: Only resets page if value actually changed */}
                  <select value={vendorInput} onChange={(e) => {
                    if (e.target.value !== vendorInput) { setVendorInput(e.target.value); setPage(1); }
                  }} className="p-2 rounded-xl bg-white cursor-pointer">
                    <option value="">All Vendors</option>
                    {vendors.map(v => <option key={v._id} value={v.user?._id}>{v.code} - {v.user?.firstName} {v.user?.lastName}</option>)}
                  </select>

                  <select value={routeInput} onChange={(e) => {
                    if (e.target.value !== routeInput) { setRouteInput(e.target.value); setPage(1); }
                  }} className="p-2 rounded-xl bg-white cursor-pointer">
                    <option value="">All Routes</option>
                    {routes.map(r => <option key={r._id} value={r._id}>{r.code} - {r.user?.firstName} {r.user?.lastName}</option>)}
                  </select>

                  <select value={warehouseInput} onChange={(e) => {
                    if (e.target.value !== warehouseInput) { setWarehouseInput(e.target.value); setPage(1); }
                  }} className="p-2 rounded-xl bg-white cursor-pointer">
                    <option value="">All Warehouse</option>
                    {warehouseUsers.map(w => <option key={w._id} value={w._id}>{w.firstName} {w.lastName}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        }
        {showFilters && (
          <div className="flex whitespace-nowrap overflow-auto gap-2 mb-3">
            {userRole === "admin" && (
              <>
                {filterOptions.map((f) => {
                  const isActive = f.key === "total" || f.key === "subtotal" ? !!activeFilters[f.key] : activeFilters[f.key] === f.value;
                  const isInputActive = activeInput === f.key;

                  if (f.key === "total" || f.key === "subtotal") {
                    return (
                      <div key={f.key} className="flex whitespace-nowrap items-center gap-5">
                        {!isInputActive ? (
                          <button
                            onClick={() => {
                              if (isActive) {
                                setActiveFilters((prev) => {
                                  const copy = { ...prev };
                                  delete copy[f.key];
                                  return copy;
                                });
                                setPage(1);
                              } else {
                                setActiveInput(f.key);
                                setTempValue("");
                              }
                            }}
                            className={`px-3 py-2 rounded-xl whitespace-nowrap shadow-xl transition-all duration:300 cursor-pointer ${isActive ? "bg-(--tertiary) text-white" : "bg-white hover:bg-gray-100"}`}
                          >
                            {isActive ? `${f.label}:${activeFilters[f.key]}` : f.label}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="number" inputMode="decimal" step="0.01" value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="px-2 py-1 rounded-xl bg-white shadow-xl w-24" placeholder="value" autoFocus />
                            <button onClick={() => { if (tempValue) setActiveFilters((prev) => ({ ...prev, [f.key]: tempValue })); setActiveInput(null); setTempValue(""); setPage(1); }} className="px-3 py-2 rounded-xl bg-blue-500 text-white cursor-pointer">OK</button>
                            <button onClick={() => { setActiveInput(null); setTempValue(""); }} className="px-3 py-2 rounded-xl bg-gray-300 text-black cursor-pointer">Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button key={f.label} onClick={() => toggleFilters(f.key, f.value)} className={`px-3 py-1 rounded-xl shadow-xl transition-all duration-200 cursor-pointer ${isActive ? "bg-(--tertiary) text-white" : "bg-white hover:bg-gray-100"}`}>
                      {f.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
        <div className='flex-1 overflow-auto rounded-xl shadow-xl bg-white font-mono'>
          <table className="w-full text-left text-sm">
            <thead className="bg-(--tertiary) sticky top-0 whitespace-nowrap">
              <tr className="border-b">
                {userRole === "admin" &&
                  <>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((it: any) => selectedIds.includes(it._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(paginatedItems.filter((it: any) => it.status !== "cancelled" && it.status !== "delivered").map((it: any) => it._id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="px-2 py-2 h-5 w-5 cursor-pointer"
                      />
                    </th>
                    <th className="p-2">Assing Route</th>
                  </>
                }
                <th className="p-2">Number #</th>
                <th className="p-2">Client</th>
                <th className="p-2">Subtotal</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status</th>
                {userRole === "admin" &&
                  <>
                    <th className="p-2 text-center">Created By</th>
                    <th className="p-2 text-center">Creation Date</th>
                    <th className="p-2 text-center">Created At</th>
                    <th className="p-2 text-center">Location</th>
                    <th className="p-2 text-center">Assembled By</th>
                    <th className="p-2 text-center">Assembled Date</th>
                    <th className="p-2 text-center">Assembled At</th>
                    <th className="p-2 text-center">Assigned Route</th>
                    <th className="p-2 text-center">Delivered Date</th>
                    <th className="p-2 text-center">Delivered At</th>
                  </>
                }
                <th className="p-2">Cancel</th>
                {userRole === "admin" &&
                  <>
                    <th className="p-2 text-center">Cancelled Date</th>
                    <th className="p-2 text-center">Cancelled At</th>
                    <th className="p-2 text-center">Cancelled By</th>
                  </>}
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedItems.length === 0 && !loading ? (
                <tr><td colSpan={18} className="text-center p-4 text-gray-500">No records found.</td></tr>
              ) : (
                paginatedItems.map((it: any) => (
                  <tr key={it._id} className="border-b hover:bg-gray-100 cursor-pointer whitespace-nowrap">
                    {userRole === "admin" && it.status !== "cancelled" && it.status !== "delivered" &&
                      <>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            disabled={it.status === "cancelled" || it.status === "delivered"}
                            checked={selectedIds.includes(it._id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(prev => [...prev, it._id]);
                              else setSelectedIds(prev => prev.filter(id => id !== it._id));
                            }}
                            className="p-2 h-5 w-5 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button className="text-blue-800 bg-blue-400 p-2 text-xl rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-all duration:300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPreorder2(it);
                              setSelectedClient(it.client?.clientName);
                              setAssignRouteModalOpen(true);
                            }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                            </svg>
                          </button>
                        </td>
                      </>
                    }
                    {userRole === "admin" && (it.status === "cancelled" || it.status === "delivered") &&
                      <><td className="P-2 text-center">-</td><td className="P-2 text-center">-</td></>
                    }
                    <td className="p-2 font-bold" onClick={() => setSelectedPreorder(it)}>{it.number}</td>
                    <td className="p-2 capitalize font-bold" onClick={() => setSelectedPreorder(it)}>{it.client?.clientName?.toLowerCase()}</td>
                    <td className="p-2 font-bold" onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.subtotal)}</td>
                    <td className={`p-2 font-bold ${it.status === "cancelled" ? "text-red-800" : it.status === "delivered" ? it.subtotal === it.total ? "text-green-800" : "text-red-800" : ""}`} onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.total)}</td>
                    <td className={`p-2`} onClick={() => setSelectedPreorder(it)}>
                      <div className={`px-1 py-1 rounded-xl text-center font-bold ${statusColors[it.status]}`}>{it.status.toUpperCase()}</div>
                    </td>
                    {userRole === "admin" &&
                      <>
                        <td className="p-2 capitalize" onClick={() => setSelectedPreorder(it)}>{it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}</td>
                        <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.createdAt)}</td>
                        <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.createdAt)}</td>
                        <td className="p-2 text-center w-48" onClick={(e) => e.stopPropagation()}>
                          {it.location ? (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${it.location.latitude},${it.location.longitude}`} target="_blank" rel="noopener noreferrer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="md:w-48 group p-2 rounded-xl font-bold text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-500 ease-in-out cursor-pointer justify-center items-center">
                              <span>{isLocationHovered ? "Check Location" : `${it.location.latitude.toFixed(5)}, ${it.location.longitude.toFixed(5)}`}</span>
                            </a>
                          ) : "-"}
                        </td>
                        {it.assembledBy ? (
                          <>
                            <td className="p-2" onClick={() => setSelectedPreorder(it)}>{it.assembledBy?.firstName} {it.assembledBy?.lastName}</td>
                            <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.assembledAt)}</td>
                            <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.assembledAt)}</td>
                          </>
                        ) : <td colSpan={3} className="text-center">-</td>}
                        <td className="p-2 capitalize text-center" onClick={() => setSelectedPreorder(it)}>
                          {it.status === "delivered" ? (
                            <>{it.routeAssigned?.code} | {it.deliveredBy?.firstName?.toLowerCase()} {it.deliveredBy?.lastName?.toLowerCase()}</>
                          ) : it.routeAssigned ? (
                            <>{it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName?.toLowerCase()} {it.routeAssigned?.user?.lastName?.toLowerCase()}</>
                          ) : "-"}
                        </td>
                        {it.deliveredAt ? (
                          <>
                            <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.deliveredAt)}</td>
                            <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.deliveredAt)}</td>
                          </>
                        ) : <td colSpan={2} className="text-center">-</td>}
                      </>
                    }
                    {it.status !== "cancelled" && it.paymentStatus !== "paid" ? (
                      <td className="p-2 text-center">
                        <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:500' onClick={(e) => { e.stopPropagation(); setSelectedPreorder2(it); setCancelModalOpen(true); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                      </td>
                    ) : <td className="p-2 text-center">-</td>}

                    {userRole === "admin" && it.status === "cancelled" ? (
                      <td className="p-2 text-red-600 text-center" onClick={() => setSelectedPreorder(it)}>{formatDate(it.cancelledAt)}</td>
                    ) : <td colSpan={3} className="p-2 text-center">-</td>}
                    {userRole === "admin" && it.status === "cancelled" ? (
                      <td className="p-2 text-red-600 text-center" onClick={() => setSelectedPreorder(it)}>{formatTime(it.cancelledAt)}</td>
                    ) : <td></td>}
                    {userRole === "admin" && it.status === "cancelled" ? (
                      <td className="p-2 text-red-600 text-center capitalize" onClick={() => setSelectedPreorder(it)}>{it.cancelledBy?.firstName?.toLowerCase()} {it.cancelledBy?.lastName?.toLowerCase()}</td>
                    ) : <td></td>}
                  </tr>
                )))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-2 gap-2">
          <div className="flex gap-2 w-full md:w-auto justify-between items-center">
            {userRole === "admin" && selectedIds.length > 0 && (
              <button onClick={() => { setSelectedPreorder2(null); setAssignRouteModalOpen(true); }} className="text-sm md:text-[16px] font-bold p-2 bg-blue-400 text-blue-800 hover:text-white rounded-xl shadow-xl hover:bg-blue-800 transition-all duration:300 cursor-pointer">
                Assign {selectedIds.length} Selected
              </button>
            )}
            {userRole === "admin" && (
              <button
                onClick={exportForRoutes}
                className="text-sm md:text-[16px] p-2 font-bold bg-green-400 text-green-800 hover:text-white rounded-xl shadow-xl hover:bg-green-800 cursor-pointer transition-all duration:300"
              >
                Export for Routes
              </button>
            )}
          </div>
          <div className="text-sm md:text-[16px] flex w-full md:w-auto font-mono font-bold items-center justify-between gap-4">
            <span className="hidden md:block">
              Showing {paginatedItems.length} of {filteredItems.length} Records
            </span>
            <button disabled={page === 1} onClick={() => handleSetPage("back")} className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page === 1 ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            </button>
            <span className="px-3 py-1">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => handleSetPage("forward")} className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        </div>

        {/* MODALS */}
        {selectedPreorder && <PreorderDetailsModal preorder={selectedPreorder} onClose={() => setSelectedPreorder(null)} onEdit={(preorder) => { setEditingPreorder(preorder); }} userRole={userRole} />}
        {editingPreorder && <PreorderWizard userRole={userRole} mode="edit" existingPreorder={editingPreorder} />}

        {assignRouteModalOpen && (
          <AssignRouteModal
            bulkMode={selectedIds.length > 0}
            preorderIds={selectedIds.length > 0 ? selectedIds : undefined}
            clientName={selectedClient}
            preorderId={selectedPreorder2?._id}
            currentRouteId={selectedPreorder2?.routeAssigned?._id ?? selectedPreorder2?.routeAssigned}
            onClose={() => { setAssignRouteModalOpen(false); setSelectedIds([]); }}
            onAssigned={() => { reload(); setSelectedIds([]); }}
          />
        )}
        {cancelModalOpen && selectedPreorder2 && (
          <CancelPreorderModal preorder={selectedPreorder2} onClose={() => setCancelModalOpen(false)} onConfirm={cancelPreorder} />
        )}
        {submitStatus && <SubmitResultModal status={submitStatus} message={message} onClose={() => { setSubmitStatus(null); setMessage(""); setCancelModalOpen(false); }} collection="Preorder" />}
      </div>
    </div>
  );
}