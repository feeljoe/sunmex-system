"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { RefreshButton } from "../ui/RefreshButton";
import { useEffect, useState } from "react";
import { DateRangePicker } from "../ui/DateRangePicker";
import PreorderDetailsModal from "../modals/PreorderDetailsModal";
import CreditMemoDetailsModal from "../modals/CreditMemoDetailsModal";

export function GeneralReportsTable(){
    const statusColors: Record<string, string> = {
        pending: "bg-gray-300",
        assigned: "bg-(--tertiary)",
        ready: "bg-blue-500 text-white",
        delivered: "bg-green-500 text-white",
        received: "bg-green-500 text-white",
        cancelled: "bg-red-500 text-white",
      };
    const [page, setPage] = useState(1);
    const [limit] = useState(100);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [vendorId, setVendorId] = useState("");
    const [driverId, setDriverId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [vendors, setVendors] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [warehouseUsers, setWarehouseUsers] = useState<any[]>([]);
    const [selectedPreorder, setSelectedPreorder] = useState<any | null> (null);
    const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
    const [loadingRow, setLoadingRow] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
          try {
            const res = await fetch("/api/users?limit=200");
            const data = await res.json();
      
            if (res.ok) {
              setVendors(data.items.filter((u: any) => u.userRole === "vendor"));
              setDrivers(data.items.filter((u: any) => u.userRole === "driver"));
              setWarehouseUsers(data.items.filter((u: any) => u.userRole === "warehouse"));
            }
          } catch (err) {
            console.error("Failed to fetch users:", err);
          }
        };
      
        fetchUsers();
      }, []);

    const {items, total, reload} = useList("/api/reports/general", {
        page,
        limit,
        search,
        type: typeFilter,
        status: statusFilter,
        vendorId,
        driverId,
        warehouseId,
        fromDate,
        toDate,
    });

    const handleExport = async () => {
        try {
          const params = new URLSearchParams({
            page: "1",
            limit: "1000000", // export ALL filtered data
            search,
            fromDate: fromDate || "",
            toDate: toDate || "",
            type: typeFilter || "",
            status: statusFilter || "",
            vendorId: vendorId || "",
            driverId: driverId || "",
            warehouseId: warehouseId || "",
            export: "true", // important flag
          });
      
          const res = await fetch(`/api/reports/general/export?${params.toString()}`);
          if (!res.ok) throw new Error("Export failed");
      
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
      
          const a = document.createElement("a");
          a.href = url;
          
          const formatDateForFile = (dateStr: string) => {
            const d = new Date(dateStr + "T00:00:00");
            return d.toLocaleDateString("en-US");
          };
          
          let fileName = "general-report.xlsx";
          
          if (fromDate && toDate) {
            if (fromDate === toDate) {
              fileName = `general-report-${formatDateForFile(fromDate)}.xlsx`;
            } else {
              fileName = `general-report-from-${formatDateForFile(fromDate)}-to-${formatDateForFile(toDate)}.xlsx`;
            }
          } else if (fromDate) {
            fileName = `general-report-from-${formatDateForFile(fromDate)}.xlsx`;
          }
          
          a.download = fileName;

          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          console.error(err);
          alert("Export failed");
        }
      };

    const handleRowClick = async (it:any) => {
        setLoadingRow(it._id);
        try{
            if(it.type === "preorder"){
                const res = await fetch(`/api/preOrders/${it._id}`);
                const data = await res.json();
                if(res.ok){
                    setSelectedPreorder(data);
                }
            }
            if(it.type === "creditMemo"){
                const res = await fetch(`/api/credit-memos/${it._id}`);
                const data = await res.json();

                if(res.ok){
                    setSelectedCreditMemo(data);
                }
            }
        }catch (err) {
            console.error("Failed to load item: ", err);
        }finally {
            setLoadingRow(null);
        }
    }
    const totalPages = Math.max(1, Math.ceil(total/limit));
    const formatCurrency = (v?: number) => 
        v !== null ? `$${v?.toFixed(2)}` : "-";
    const formatDate = (v?: string) =>
        v ? new Date(v).toLocaleDateString(): "-";
    const formatTime = (v?:string) =>
        v
            ? new Date(v).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            })
            : "-";
    return (
        <div className="bg-(--secondary) rounded-lg shadow-xl p-6 flex flex-col h-4/5">
            <div className="flex justify-between mb-4 gap-5">
                <SearchBar
                    placeholder="Search Reports..."
                    onSearch={setSearch}
                    debounce
                />
                <RefreshButton onRefresh={reload} />
                <button
                    onClick={handleExport}
                    className="px-5 py-1 bg-green-600 text-white rounded-xl shadow-xl cursor-pointer hover:bg-green-300 transition-all duration:300"
                    >
                    Export General Report
                </button>
            </div>
            <p className="border-b text-center text-xl font-bold mb-4">Filters</p>
            <div className="flex mb-4 justify-center">
                <DateRangePicker
                    fromDate={fromDate}
                    toDate={toDate}
                    onChange={(from, to) => {
                    setFromDate(from);
                    setToDate(to);
                    }}
                />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <select onChange={(e) => setTypeFilter(e.target.value)} className="p-2 rounded-xl bg-white h-8 cursor-pointer">
                    <option value="">All Types</option>
                    <option value="preorder">Preorders</option>
                    <option value="creditMemo">Credit Memos</option>
                </select>

                <select onChange={(e) => setStatusFilter(e.target.value)} className="p-2 rounded-xl bg-white h-8 cursor-pointer">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                <select onChange={(e) => setVendorId(e.target.value)} className="p-2 rounded-xl bg-white h-8 cursor-pointer">
                    <option value="">All Vendors</option>
                    {vendors.map(v => (
                    <option key={v._id} value={v._id}>
                        {v.firstName} {v.lastName}
                    </option>
                    ))}
                </select>

                <select onChange={(e) => setDriverId(e.target.value)} className="p-2 rounded-xl bg-white h-8 cursor-pointer">
                    <option value="">All Drivers</option>
                    {drivers.map(d => (
                    <option key={d._id} value={d._id}>
                        {d.firstName} {d.lastName}
                    </option>
                    ))}
                </select>

                <select onChange={(e) => setWarehouseId(e.target.value)} className="p-2 rounded-xl bg-white h-8 cursor-pointer">
                    <option value="">All Warehouse</option>
                    {warehouseUsers.map(w => (
                    <option key={w._id} value={w._id}>
                        {w.firstName} {w.lastName}
                    </option>
                    ))}
                </select>

                </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm lg:text-md">
                    <thead className="">
                        <tr className="sticky border-b whitespace-nowrap text-center">
                            <th className="p-2">Type</th>
                            <th className="p-2">Number #</th>
                            <th className="p-2">Client</th>
                            <th className="p-2">Subtotal</th>
                            <th className="p-2">Total</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Created By</th>
                            <th className="p-2">Created Date</th>
                            <th className="p-2">Created At</th>
                            <th className="p-2">Assembled By</th>
                            <th className="p-2">Assembled Date</th>
                            <th className="p-2">Assembled At</th>
                            <th className="p-2">Handled By</th>
                            <th className="p-2">Completed Date</th>
                            <th className="p-2">Completed At</th>
                            <th className="p-2">Cancelled Date</th>
                            <th className="p-2">Cancelled By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it: any) => (
                            <tr key={it._id} onClick={() => handleRowClick(it)} className="border-b hover:bg-gray-100 cursor-pointer whitespace-nowrap">
                                <td className="p-2 capitalize">
                                    {it.type === "preorder" ? "Preorder" : "Credit Memo"}
                                </td>

                                <td className="p-2">{it.number}</td>
                                <td className="p-2">{it.clientName}</td>
                                <td className="p-2 text-right">{formatCurrency(it.subtotal)}</td>
                                <td className="p-2 text-right">{formatCurrency(it.total)}</td>
                                <td className="p-2 text-center">
                                    <div className={`px-2 py-2 rounded-xl text-center
                                        ${statusColors[it.status]}`}>
                                            {it.status?.toUpperCase()}
                                    </div>
                                </td>
                                <td className="p-2 text-center">{it.createdBy}</td>
                                <td className="p-2 text-center">{formatDate(it.createdAt)}</td>
                                <td className="p-2 text-center">{formatTime(it.createdAt)}</td>
                                <td className="p-2 text-center">{it.assembledBy}</td>
                                <td className="p-2 text-center">{formatDate(it.assembledAt)}</td>
                                <td className="p-2 text-center">{formatTime(it.assembledAt)}</td>
                                {it.handledCode && (<td className="p-2 text-center">{it.handledCode} | {it.handledBy}</td>)}
                                {!it.handledCode && (<td className="p-2 text-center">-</td>)}
                                <td className="p-2 text-center">{formatDate(it.completedAt)}</td>
                                <td className="p-2 text-center">{formatTime(it.completedAt)}</td>
                                <td className="p-2 text-right text-red-500 font-bold">{formatDate(it.cancelledAt)}</td>
                                <td className="p-2 text-right text-red-500 font-bold">{it.cancelledBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end items-center gap-4 mt-4">
                <span>Showing {items.length} of {total}</span>
                <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 bg-(--quarteary) text-white rounded-xl cursor-pointer"
                >
                    Prev  
                </button>
                <span>
                    Page {page} of {totalPages}
                </span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2 py-1 bg-(--quarteary) text-white rounded-xl cursor-pointer"
                >
                    Next
                </button>
            </div>
            {/* Preorder Modal */}
            {selectedPreorder && (
                <PreorderDetailsModal
                    preorder={selectedPreorder}
                    onClose={() => setSelectedPreorder(null)}
                    userRole="admin"
                    onEdit={selectedPreorder}
                />
            )}
            {/* Credit Memo Modal */}
            {selectedCreditMemo && (
                <CreditMemoDetailsModal
                    creditMemo={selectedCreditMemo}
                    onClose={() => setSelectedCreditMemo(null)}
                    onEdit={selectedCreditMemo}
                />
            )}
        </div>
    )
}