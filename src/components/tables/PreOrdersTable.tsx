"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useRef, useState } from "react";
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

export function PreordersTable({ userRole, userId }:{ userRole: string, userId: string}) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-400 text-gray-800",
    assigned: "bg-(--tertiary) text-(--quarteary)",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
  };  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [editingPreorder, setEditingPreorder] = useState(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const todayISO = () =>
    new Date().toISOString().split("T")[0]; // YYYY-MM-DD  

  const [fromDate, setFromDate] = useState<string>(userRole === "vendor" ? "" : () => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(userRole === "vendor" ? "" : () => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));
  const today = todayISO();
  // Data for selects
  const [vendors, setVendors] = useState<any[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  
  // Fetch users for selects
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        const data = await res.json();
        if(res.ok){
          setVendors(data.items.filter((u: any) => u.userRole === "vendor"));
          setWarehouseUsers(data.items.filter((u: any) => u.userRole === "warehouse"));
        }
      } catch(err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch routes for select (/api/routes)
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
  const { items, total, reload } = useList("/api/preOrders", {
    page,
    limit,
    search,
    fromDate: userRole === "vendor" ? today : fromDate,
    toDate: userRole === "vendor" ? today : toDate,
    vendorId: userRole === "vendor" ? userId : vendorInput,
    routeId: routeInput,
    warehouseUserId: warehouseInput,
  });

  const [assignRouteModalOpen, setAssignRouteModalOpen] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [selectedPreorder2, setSelectedPreorder2] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  const [message, setMessage] = useState("");

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "-";

  const cancelPreorder = async (reason: string) => {
    
    if(!selectedPreorder2) {
      setSubmitStatus("error");
      setMessage("No preorder selected");
      return;
    }

    setSubmitStatus("loading");
    try {
      const res = await fetch(`/api/preOrders/${selectedPreorder2._id}/cancel`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reason}),
      });
      if(!res.ok) {
        const err = await res.json();
  
        setMessage(err.error || "Failed to cancel preorder");
        setSubmitStatus("error");
        return;
      }
      const updated = await res.json();
      const idx = items.findIndex((i: any) => i._id === (updated._id));
      if(idx !== -1) items[idx] = updated;
      setSubmitStatus("success");
      setSelectedPreorder(null);
    }catch(err:any){
      setMessage(err.message);
      setSubmitStatus("error");
    }finally{
      setCancelModalOpen(false);
      reload();
    }
  };

  const totalPages = total > 0? Math.ceil(total/limit): 1;

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
    { label: "Assigned", key: "status", value: "assigned" },
    { label: "Ready", key: "status", value: "ready" },
    { label: "Delivered", key: "status", value: "delivered" },
    { label: "Cancelled", key: "status", value: "cancelled" },
    { label: "Payment Pending", key: "payment", value: "pending" },
    { label: "Paid", key: "payment", value: "paid" },
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
    <div className={`h-[75vh] ${userRole === "admin" ? "w-[90vw]" : "w-[95vw]"}`}>
    <div className="flex items-center justify-end py-2">
    <Link href="/pages/sales/preorders/add-preorder">
            <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
                Make Pre Order
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
            </button>
            </Link>
    </div>
    <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-5'>
      {userRole ==="admin" &&
      <>
      <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
      <div className="flex justify-between mb-5 flex-wrap h-10">
      {/* VENDOR */}
      <select
        value={vendorInput}
        onChange={(e) => setVendorInput(e.target.value)}
        className="p-2 rounded-xl bg-white cursor-pointer"
      >
        <option value="">All Vendors</option>
        {vendors.map(v => <option key={v._id} value={v.user?._id}>{v.code} - {v.user?.firstName} {v.user?.lastName}</option>)}
      </select>

      {/* ROUTE */}
      <select
        value={routeInput}
        onChange={(e) => setRouteInput(e.target.value)}
        className="p-2 rounded-xl bg-white cursor-pointer"
      >
        <option value="">All Routes</option>
        {routes.map(r => <option key={r._id} value={r._id}>{r.code} - {r.user?.firstName} {r.user?.lastName}</option>)}
      </select>

      {/* WAREHOUSE */}
      <select
        value={warehouseInput}
        onChange={(e) => setWarehouseInput(e.target.value)}
        className="p-2 rounded-xl bg-white cursor-pointer"
      >
        <option value="">All Warehouse</option>
        {warehouseUsers.map(w => <option key={w._id} value={w._id}>{w.firstName} {w.lastName}</option>)}
      </select>
      </div>
      </>
      }
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
        <SearchBar
          placeholder="Search preorders..."
          onSearch={setSearch}
          debounce
        />
        <RefreshButton onRefresh={() => {
          reload();
          setSubmitStatus("loading");
          setTimeout(() => setSubmitStatus(null), 3000);
          }}
        />
      </div>
      <div className="flex whitespace-nowrap overflow-auto gap-2 mb-3">
      {userRole === "admin" && (
        <>
        {filterOptions.map((f)=>{
          const isActive = f.key === "total" || f.key === "subtotal"
          ? !!activeFilters[f.key]
          : activeFilters[f.key] === f.value;
          const isInputActive = activeInput === f.key;

          if(f.key === "total" || f.key === "subtotal"){
            return (
              <div key={f.key} className="flex whitespace-nowrap items-center gap-5">
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
                      px-3 py-2 rounded-xl whitespace-nowrap shadow-xl transition-all duration:300 cursor-pointer
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
                      className="px-3 py-2 rounded-xl bg-blue-500 text-white cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setActiveInput(null);
                          setTempValue("");
                        }}
                        className="px-3 py-2 rounded-xl bg-gray-300 text-black cursor-pointer"
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
                px-3 py-1 rounded-xl shadow-xl transition-all duration-200 cursor-pointer

                ${isActive
                  ? "bg-(--tertiary) text-white"
                  : "bg-white hover:bg-gray-100"}
              `}
            >
              {f.label}</button>
          );
        })}
      </>
      )}
      </div>
      <div className='flex-1 overflow-auto rounded-xl shadow-xl bg-white font-mono'>
      <table className="w-full text-left text-sm">
        <thead className="bg-(--tertiary) sticky top-0">
          <tr className="border-b">
            {userRole === "admin" &&
              <>
                <th className="p-2">
                  <input 
                    type="checkbox"
                    checked={
                      items.length > 0 &&
                      items.every((it:any) =>
                        selectedIds.includes(it._id)
                      )
                    }
                    onChange={(e) => {
                      if(e.target.checked){
                        const selectable = items
                          .filter((it:any) =>
                            it.status !== "cancelled" &&
                            it.status !== "delivered"
                          ).map((it: any) => it._id);
                          setSelectedIds(selectable);
                      }else {
                        setSelectedIds([]);
                      }
                    }}
                    className="px-2 py-2 h-5 w-5"
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
            {userRole ==="admin" &&
              <>
                <th className="p-2">Created By</th>
                <th className="p-2">Creation Date</th>
                <th className="p-2">Created At</th>
                <th className="p-2">Assembled By</th>
                <th className="p-2">Assembled Date</th>
                <th className="p-2">Assembled At</th>
                <th className="p-2">Assigned Route</th>
                <th className="p-2">Delivered Date</th>
                <th className="p-2">Delivered At</th>
                </>
            }
                <th className="p-2">Cancel</th>
            {userRole ==="admin" && 
            <>
            <th className="p-2">Cancelled Date</th>
            <th className="p-2">Cancelled At</th>
            <th className="p-2">Cancelled By</th>
            </>}
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((it: any) => (
            <tr key={it._id} className="border-b hover:bg-gray-100 cursor-pointer whitespace-nowrap">
              {userRole === "admin" && it.status !== "cancelled" && it.status !== "delivered" &&
              <>
                <td className="p-2 text-center">
                  {it.status !== "cancelled" &&
                   it.status !== "delivered" && (
                    <input 
                      type="checkbox"
                      disabled={it.status === "cancelled" || it.status === "delivered"}
                      checked={selectedIds.includes(it._id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if(e.target.checked){
                          setSelectedIds(prev => [...prev, it._id]);
                        }else {
                          setSelectedIds(prev =>
                            prev.filter(id => id !== it._id)
                          );
                        }
                      }}
                      className="p-2 h-5 w-5"
                    />
                   )}

                </td>
                <td className="p-2 text-center">
                  <button className="text-blue-800 bg-blue-400 p-2 text-xl rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-all duration:300"
                  onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreorder2(it);
                      setSelectedClient(it.client.clientName);
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
              <>
              <td className="P-2 text-center">-</td>
              <td className="P-2 text-center">-</td>
              </>
              }
              <td className="p-2 font-bold" onClick={() => setSelectedPreorder(it)}>{it.number}</td>
              <td className="p-2 capitalize font-bold" onClick={() => setSelectedPreorder(it)}>{it.client?.clientName?.toLowerCase()}</td>
              <td className="p-2 font-bold" onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.subtotal)}</td>
              <td className={`p-2 font-bold ${it.status === "cancelled" ? "text-red-800" : it.status === "delivered" ? it.subtotal === it.total ? "text-green-800" : "text-red-800": ""}`} onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.total)}</td>
              <td className={`p-2`} onClick={() => setSelectedPreorder(it)}>
                <div className={`px-1 py-1 rounded-xl text-center font-bold
                  ${statusColors[it.status]}`}>{it.status.toUpperCase()}</div></td>
              {userRole === "admin" &&
              <>
              <td className="p-2 capitalize" onClick={() => setSelectedPreorder(it)}>{it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.createdAt)}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.createdAt)}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{it.assembledBy?.firstName} {it.assembledBy?.lastName}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.assembledAt)}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.assembledAt)}</td>
              <td className="p-2 capitalize" onClick={() => setSelectedPreorder(it)}>
              {it.status === "delivered" ? (
                // If delivered, show the historical permanent record
                <>
                  {it.routeAssigned?.code} | {it.deliveredBy?.firstName?.toLowerCase()} {it.deliveredBy?.lastName?.toLowerCase()}
                </>
              ) : (
                // If pending/assigned, show whoever is currently holding the route
                <>
                  {it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName?.toLowerCase()} {it.routeAssigned?.user?.lastName?.toLowerCase()}
                </>
              )}
              </td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatDate(it.deliveredAt)}</td>
              <td className="p-2" onClick={() => setSelectedPreorder(it)}>{formatTime(it.deliveredAt)}</td>
              </>
              }
              {it.status !== "cancelled" && it.paymentStatus !== "paid" ? (
              <td className="p-2 text-center">
                <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:500' 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreorder2(it);
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
              
              {userRole ==="admin" && it.status === "cancelled" ? (
              <td className="p-2 text-red-600 text-center" onClick={() => setSelectedPreorder(it)}>{formatDate(it.cancelledAt)}</td>
              ) : (
                <td colSpan={3} className="p-2 text-center">-</td>
              )}
              
              {userRole ==="admin" && it.status === "cancelled" ? (
              <td className="p-2 text-red-600 text-center" onClick={() => setSelectedPreorder(it)}>{formatTime(it.cancelledAt)}</td>
            ) : (
              <td></td>
            )}
              {userRole ==="admin" && it.status === "cancelled" ? (
              <td className="p-2 text-red-600 text-center capitalize" onClick={() => setSelectedPreorder(it)}>{it.cancelledBy.firstName?.toLowerCase()} {it.cancelledBy.lastName?.toLowerCase()}</td>
            ) : (
              <td></td>
            )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-4 items-center">
          {userRole === "admin" && selectedIds.length > 0 && (
            <button
            onClick={()=> {
              setSelectedPreorder2(null);
              setAssignRouteModalOpen(true);
            }}
            className="p-2 bg-blue-400 text-blue-800 hover:text-white rounded-xl shadow-xl hover:bg-blue-800 transition-all duration:300 cursor-pointer">
              Assign {selectedIds.length} Selected
            </button>
          )}
          {userRole === "admin" && (
          <button
          onClick={async () => {
            setSubmitStatus("loading");
            const res = await fetch("/api/preOrders/for-routes");
            if(!res.ok){
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
          }}
          className="p-2 bg-green-400 text-green-800 hover:text-white rounded-xl shadow-xl hover:bg-green-800 cursor-pointer transition-all duration:300">
            Export for Routes
          </button>
          )}
        </div>
        <div className="flex font-mono font-bold items-center gap-4">
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
      {selectedPreorder &&
      <PreorderDetailsModal
        preorder={selectedPreorder}
        onClose={() => setSelectedPreorder(null)}
        onEdit={(preorder)=> {
          setEditingPreorder(preorder);
        }}
        userRole={userRole}
        />
      }
      {editingPreorder && (
        <PreorderWizard
          userRole={userRole}
          mode="edit"
          existingPreorder={editingPreorder}
        />
      )}
      {assignRouteModalOpen && (
        <AssignRouteModal
          bulkMode={selectedIds.length > 0}
          preorderIds={selectedIds.length > 0 ? selectedIds : undefined}
          clientName={selectedClient}
          preorderId={selectedPreorder2?._id}
          currentRouteId={selectedPreorder2?.routeAssigned?._id ?? selectedPreorder2?.routeAssigned}
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
      {cancelModalOpen && selectedPreorder2 && (
        <CancelPreorderModal
          preorder={selectedPreorder2}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={cancelPreorder}
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
            collection="Preorder"
        />
      )}
    </div>   
    </div>
  );
}
