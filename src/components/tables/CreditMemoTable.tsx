"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useState, useMemo, useCallback } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import CancelCreditMemoModal from "../modals/CancelCreditMemoModal";
import CreditMemoDetailsModal from "../modals/CreditMemoDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import AssignRouteModal from "../modals/AssignRouteModal";
import CloseCreditMemosModal from "../modals/CloseCreditMemosModal";
import { DateTime } from "luxon";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import CreditMemoMobileCard from "../mobile/CreditMemoMobileCard";
import CreditMemoMobileDetailsModal from "../modals/CreditMemoMobileDetailsModal";
import CreditMemoMobileFiltersModal from "../modals/CreditMemoMobileFiltersModal";
import { useSidebar } from "@/app/components/SideBarContext";

export function CreditMemosTable({ userRole, userId }: { userRole: string; userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    received: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };
  const { sidebarOpen } = useSidebar();

  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignRouteModalOpen, setAssignRouteModalOpen] = useState(false);
  const [closeCreditMemosOpen, setCloseCreditMemosOpen] = useState(false);
  const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1279px)");

    const updateLayout = () => {
      setIsMobileLayout(media.matches);
    };

    updateLayout();

    media.addEventListener("change", updateLayout);

    return () => {
      media.removeEventListener("change", updateLayout);
    };
  }, []);

  const today = DateTime.now().setZone("America/Phoenix").toFormat("yyyy-MM-dd");

  const [fromDate, setFromDate] = useState(userRole === "vendor" ? today : () => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [toDate, setToDate] = useState(userRole === "vendor" ? today : () => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));

  // Data for selects
  const [vendors, setVendors] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Fetch routes for select (assuming /api/routes)
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

  const filterSearch = useMemo(() => {
    const expressions = Object.entries(activeFilters)
      .filter(([, value]) => value.trim() !== "").map(([key, value]) => `${key}:${value}`);
    return [search.trim(), ...expressions].filter(Boolean).join(" ");
  }, [search, activeFilters]);
  const handleSearch = useCallback((value: string) => {
    setSearch((previous) => previous === value ? previous : value);
    setPage(1);
  }, []);

  const { items, total, reload } = useList("/api/credit-memos", {
    page,
    limit,
    search: filterSearch,
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
      setSelectedIds((previous) =>
        previous.filter((id) => id !== cancelTarget._id)
      );
      await reload();
      setSubmitStatus("success");
      setCancelTarget(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleFilters = (key: string, value: string) => {
    setActiveFilters((previous) => {
      const next = { ...previous };

      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }

      return next;
    });

    setPage(1);
  };
  const applyMobileFilters = (values: {
    dates: { from: string; to: string };
    vendor: string;
    route: string;
    activeFilters: Record<string, string>;
  }) => {
    setFromDate(values.dates.from);
    setToDate(values.dates.to);

    setVendorInput(values.vendor);
    setRouteInput(values.route);

    setActiveFilters(values.activeFilters);
    setPage(1);
  };

  const toggleSelected = (
    id: string,
    checked: boolean
  ) => {
    setSelectedIds((previous) =>
      checked
        ? [...new Set([...previous, id])]
        : previous.filter((selectedId) => selectedId !== id)
    );
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

  const handleSetPage = (value: string) => {
    setSubmitStatus("loading");
    if (value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  const closeCreditMemos = async (returnedQuantities: Record<string, number[]>) => {
    setSubmitStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/credit-memos/close", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditMemoIds: selectedIds,
          returnedQuantities,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to close Credit Memos");
      }
      setCloseCreditMemosOpen(false);
      setSelectedIds([]);
      reload();
      setMessage(data.message || "Credit memos closed successfully");
      setSubmitStatus("success");
    } catch (err: any) {
      setMessage(err.message || "Failed to close credit memos");
      setSubmitStatus("error");
      throw err;
    }
  };


  return (
    <div className={`flex h-[calc(100dvh-100px)] min-h-0 min-w-0 w-full flex-col transition-all duration-300 lg:h-[86vh] ${sidebarOpen ? "lg:w-[89vw]" : "lg:w-[96vw]"}`}>
      <div className="flex items-center justify-end py-2">
        <Link href="/pages/sales/creditmemo/add-creditmemo">
          <button className="flex gap-2 p-2 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
            Make Credit Memo
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
        </Link>
      </div>
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-(--secondary) p-2 shadow-xl">
        <div className="mb-2 flex shrink-0 items-center gap-2 lg:hidden">
          <div className="min-w-0 flex-1">
            <SearchBar
              placeholder="Search client or memo #..."
              onSearch={handleSearch}
              debounce
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open credit memo filters"
            className={`relative flex shrink-0 items-center justify-center rounded-xl p-2 ${Object.keys(activeFilters).length > 0 ||
              vendorInput || routeInput ? "bg-blue-600 text-white" : "bg-blue-400 text-blue-800"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
              />
            </svg>

            {(Object.keys(activeFilters).length > 0 ||
              vendorInput ||
              routeInput) && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
              )}
          </button>
          <RefreshButton onRefresh={() => reload()} />
        </div>
        <div className="mb-2 flex shrink-0 items-center justify-between px-1 text-xs font-semibold text-gray-600 lg:hidden">
          <span>{total} credit memos found</span>
          <span>{Object.keys(activeFilters).length + Number(Boolean(vendorInput)) + Number(Boolean(routeInput))}{" "} filters active</span>
        </div>
        <div className="hidden lg:block">
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
            <SearchBar placeholder="Search credit memos..." onSearch={handleSearch} debounce />
            <RefreshButton onRefresh={() => {
              setSubmitStatus("loading");
              reload();
              setTimeout(() => setSubmitStatus(null), 3000);
            }} />
          </div>
          {userRole === "admin" && (
            <div className="flex flex-wrap gap-2 mb-3">

              {filterOptions.map((f) => {
                const isActive = f.key === "total" || f.key === "subtotal"
                  ? !!activeFilters[f.key]
                  : activeFilters[f.key] === f.value;
                const isInputActive = activeInput === f.key;

                if (f.key === "total" || f.key === "subtotal") {
                  return (
                    <div key={f.key} className="flex items-center gap-2">
                      {!isInputActive ? (
                        <button
                          onClick={() => {
                            if (isActive) {
                              setActiveFilters((previous) => ({
                                ...previous,
                                [f.key]: tempValue,
                              }));
                              setPage(1);
                            } else {
                              setActiveInput(f.key);
                              setTempValue("");
                            }
                          }}
                          className={`
                      px-2 py-1 rounded-xl shadow-xl transition-all duration:300
                      ${isActive ? "bg-(--tertiary) text-white" : "bg-white hover:bg-gray-100"}
                    `}
                        >
                          {isActive ? `${f.label}:${activeFilters[f.key]}` : f.label}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="px-2 py-1 rounded-xl bg-white shadow-xl w-24"
                            placeholder="value"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (tempValue) {
                                setActiveFilters((previous) => {
                                  const next = { ...previous };
                                  delete next[f.key];
                                  return next;
                                });
                                setPage(1);
                              }
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
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain lg:hidden">
          {items.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm font-semibold text-gray-500">
              No credit memos found.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
              {items.map((it: any) => (
                <CreditMemoMobileCard
                  key={it._id}
                  creditMemo={it}
                  userRole={userRole}
                  selected={selectedIds.includes(it._id)}
                  onSelect={toggleSelected}
                  onOpen={() => setSelected(it)}
                  onAssign={() => {
                    setSelectedIds([]);
                    setSelectedCreditMemo(it);
                    setSelectedClient(it.client);
                    setAssignRouteModalOpen(true);
                  }}
                  onCancel={() => {
                    setCancelTarget(it);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="hidden min-w-0 min-h-0 flex-1 overflow-auto rounded-xl bg-white shadow-xl lg:block">
          <table className="text-left w-full text-sm">
            <thead className="bg-(--tertiary) sticky top-0">
              <tr className="border-b">
                {userRole === "admin" && (
                  <>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        checked={
                          items.some((it: any) => it.status === "pending") &&
                          items
                            .filter((it: any) => it.status === "pending")
                            .every((it: any) => selectedIds.includes(it._id))
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
                    <th className="p-2 text-center">Location</th>
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
                  className={`border-b hover:bg-gray-50 cursor-pointer whitespace-nowrap font-bold ${it.status === "cancelled" ? "text-red-500" : ""}`}
                  onClick={() => setSelected(it)}
                >
                  {userRole === "admin" && it.status === "pending" && (
                    <>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(it._id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            toggleSelected(it._id, e.target.checked)
                          }
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
                      <td className="p-2 text-center w-48" onClick={(e) => e.stopPropagation()}>
                        {it.location ? (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${it.location.latitude},${it.location.longitude}`} target="_blank" rel="noopener noreferrer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="md:w-48 group p-2 rounded-xl font-bold text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-500 ease-in-out cursor-pointer justify-center items-center">
                            <span>{isLocationHovered ? "Check Location" : `${it.location.latitude.toFixed(5)}, ${it.location.longitude.toFixed(5)}`}</span>
                          </a>
                        ) : "-"}
                      </td>
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
                      {(it.routeAssigned === undefined || it.routeAssigned === null) &&
                        <td className="p-2 capitalize"> 001 | {it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()} </td>
                      }
                      <td className="p-2">{formatDate(it.returnedAt)}</td>
                      <td className="p-2">{formatTime(it.returnedAt)}</td>
                    </>
                  )}

                  {it.warehouseStatus === "pending" && it.status !== "cancelled" ? (
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
                  {userRole === "admin" && it.status === "cancelled" ? (
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
        <div className="mt-2 flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {userRole === "admin" && selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedCreditMemo(null);
                    setAssignRouteModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-xl hover:bg-blue-700 transition-colors"
                >
                  Assign {selectedIds.length} Selected
                </button>
                <button
                  onClick={() => setCloseCreditMemosOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl shadow-xl hover:bg-green-700 transition-colors">
                  Close {selectedIds.length} Selected
                </button>
              </div>
            )}
          </div>
          <div className="flex w-full items-center justify-between gap-2 text-xs font-bold sm:w-auto sm:text-sm">
            <span className="hidden lg:inline">
              Showing {items.length} of {total} Credit Memos
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
          isMobileLayout ? (
            <CreditMemoMobileDetailsModal
              creditMemo={selected}
              userRole={userRole}
              onClose={() => setSelected(null)}
            />
          ) : (
            <CreditMemoDetailsModal
              creditMemo={selected}
              userRole={userRole}
              onClose={() => setSelected(null)}
            />
          )
        )}
        <CreditMemoMobileFiltersModal
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          onApply={applyMobileFilters}
          userRole={userRole}
          dates={{ from: fromDate, to: toDate }}
          vendorInput={vendorInput}
          routeInput={routeInput}
          activeFilters={activeFilters}
          vendors={vendors}
          routes={routes}
        />

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
        {closeCreditMemosOpen && (
          <CloseCreditMemosModal
            creditMemos={items.filter(
              (memo: any) =>
                selectedIds.includes(memo._id) && memo.status === "pending"
            )}
            onClose={() => setCloseCreditMemosOpen(false)}
            onConfirm={closeCreditMemos}
          />
        )}
      </div>
    </div>
  );
}
