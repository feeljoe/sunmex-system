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

export function PreordersTable({ userRole, userId }:{ userRole: string, userId: string}) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    assigned: "bg-(--tertiary)",
    ready: "bg-blue-500 text-white",
    delivered: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const todayISO = () =>
    new Date().toISOString().split("T")[0]; // YYYY-MM-DD  

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const today = todayISO();
   // Applied filters (used in useList)
   const [appliedFilters, setAppliedFilters] = useState({
    fromDate: userRole === "vendor" ? today : "",
    toDate: userRole === "vendor" ? today : "",
    vendorId: userRole === "vendor" ? userId : "",
    routeId: "",
    warehouseUserId: ""
  });
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
  const { items, total, reload } = useList("/api/preOrders", {
    page,
    limit,
    search,
    fromDate: appliedFilters.fromDate,
    toDate: appliedFilters.toDate,
    vendorId: appliedFilters.vendorId,
    routeId: appliedFilters.routeId,
    warehouseUserId: appliedFilters.warehouseUserId,
  });

  const [assignRouteModalOpen, setAssignRouteModalOpen] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [selectedPreorder2, setSelectedPreorder2] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
  const [message, setMessage] = useState("");
  
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

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
    }
  };

  const totalPages = total > 0? Math.ceil(total/limit): 1;

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      fromDate,
      toDate,
      vendorId: vendorInput,
      routeId: routeInput,
      warehouseUserId: warehouseInput
    });
  }

  return (
    <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
      {userRole ==="admin" &&
      <>
      <div className="flex mb-4">
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
        className="p-2 rounded border"
      >
        <option value="">All Vendors</option>
        {vendors.map(v => <option key={v._id} value={v.user?._id}>{v.code} - {v.user?.firstName} {v.user?.lastName}</option>)}
      </select>

      {/* ROUTE */}
      <select
        value={routeInput}
        onChange={(e) => setRouteInput(e.target.value)}
        className="p-2 rounded border"
      >
        <option value="">All Routes</option>
        {routes.map(r => <option key={r._id} value={r._id}>{r.code} - {r.user?.firstName} {r.user?.lastName}</option>)}
      </select>

      {/* WAREHOUSE */}
      <select
        value={warehouseInput}
        onChange={(e) => setWarehouseInput(e.target.value)}
        className="p-2 rounded border"
      >
        <option value="">All Warehouse</option>
        {warehouseUsers.map(w => <option key={w._id} value={w._id}>{w.firstName} {w.lastName}</option>)}
      </select>
      {/* FILTER BUTTON */}
      <div className="flex mb-4">
        <button
          className="px-5 py-3 bg-blue-500 text-white rounded-xl"
          onClick={applyFilters}
        >
          Apply Filters
        </button>
      </div>
      </div>
      </>
      }
      <div className="flex justify-between mb-4">
        <SearchBar
          placeholder="Search preorders..."
          onSearch={setSearch}
          debounce
        />
        <RefreshButton onRefresh={reload}/>
      </div>
      <div className='flex-1 overflow-auto'>
      <table className="w-full text-left text-sm lg:text-md">
        <thead>
          <tr className="border-b">
            {userRole === "admin" &&
              <th className="p-2">Assing Route</th>
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
        <tbody>
          {items.map((it: any) => (
            <tr key={it._id} className="border-b hover:bg-gray-50 cursor-pointer">
              {userRole === "admin" && it.status !== "cancelled" && it.status !== "delivered" &&
              <td className="p-2 text-center whitespace-nowrap">
                <button className="text-white bg-blue-500 px-3 py-3 text-xl rounded-xl hover:underline cursor-pointer hover:bg-blue-300 hover:text-(--quarteary) transition-all duration:300"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreorder2(it);
                    setSelectedClient(it.client.clientName);
                    setAssignRouteModalOpen(true);
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                    </svg>
                </button>
              </td>
              }
              {userRole === "admin" && (it.status === "cancelled" || it.status === "delivered") &&
              <td className="P-2 text-center whitespace-nowrap">-</td>
              }
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{it.number}</td>
              <td className="p-2 whitespace-nowrap capitalize" onClick={() => setSelectedPreorder(it)}>{it.client?.clientName.toLowerCase()}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.subtotal)}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatCurrency(it.total)}</td>
              <td className={`p-2 whitespace-nowrap`} onClick={() => setSelectedPreorder(it)}>
                <div className={`px-2 py-2 rounded-xl text-center
                  ${statusColors[it.status]}`}>{it.status.toUpperCase()}</div></td>
              {userRole === "admin" &&
              <>
              <td className="p-2 whitespace-nowrap capitalize" onClick={() => setSelectedPreorder(it)}>{it.createdBy?.firstName?.toLowerCase()} {it.createdBy?.lastName?.toLowerCase()}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatDate(it.createdAt)}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatTime(it.createdAt)}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{it.assembledBy?.firstName} {it.assembledBy?.lastName}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatDate(it.assembledAt)}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatTime(it.assembledAt)}</td>
              <td className="p-2 whitespace-nowrap capitalize" onClick={() => setSelectedPreorder(it)}>{it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName.toLowerCase()} {it.routeAssigned?.user?.lastName.toLowerCase()}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatDate(it.deliveredAt)}</td>
              <td className="p-2 whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatTime(it.deliveredAt)}</td>
              </>
              }
              {it.status !== "cancelled" && it.status !== "delivered" &&
              <td className="p-2 whitespace-nowrap">
                <button className='text-white bg-red-500 px-5 py-3 text-lg rounded-xl hover:underline cursor-pointer hover:bg-red-300 hover:text-(--quarteary) transition-all duration:300' 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreorder2(it);
                  setCancelModalOpen(true);
                }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                </button>
              </td>
              }
              {(it.status === "cancelled" || it.status === "delivered") &&
              <td className="p-2 text-center whitespace-nowrap">-</td>
              }
              {userRole ==="admin" && it.status === "cancelled" &&
              <td className="p-2 text-red-500 text-center whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatDate(it.cancelledAt)}</td>
              }
              
              {userRole ==="admin" && it.status === "cancelled" &&
              <td className="p-2 text-red-500 text-center whitespace-nowrap" onClick={() => setSelectedPreorder(it)}>{formatTime(it.cancelledAt)}</td>
              }
              {userRole ==="admin" && it.status === "cancelled" &&
              <td className="p-2 text-red-500 text-center whitespace-nowrap capitalize" onClick={() => setSelectedPreorder(it)}>{it.cancelledBy.firstName?.toLowerCase()} {it.cancelledBy.lastName?.toLowerCase()}</td>
              }
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end items center gap-4 mt-4">
            <span className='mt-1'>
              Showing {items.length} of {total} preorders
            </span>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-(--quarteary) text-white rounded-xl shadow-xl disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
    
            <span className="px-3 py-1">
              Page {page} of {totalPages || 1}
            </span>
    
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
      {selectedPreorder &&
      <PreorderDetailsModal
        preorder={selectedPreorder}
        onClose={() => setSelectedPreorder(null)}/>
      }
      {assignRouteModalOpen && selectedPreorder2 && (
        <AssignRouteModal
          clientName={selectedClient}
          preorderId={selectedPreorder2._id}
          currentRouteId={selectedPreorder2.route?._id}
          onClose={() => setAssignRouteModalOpen(false)}
          onAssigned={(updated) => {
            const idx = items.findIndex((i: any) => i._id === updated._id);
            if(idx !== -1) items[idx] = updated;
            setAssignRouteModalOpen(false);
            setSelectedPreorder2(null);
            reload();
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
  );
}
