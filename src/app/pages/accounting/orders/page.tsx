"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshButton } from "../../../../components/ui/RefreshButton";
import { DateRangePicker } from "../../../../components/ui/DateRangePicker";
import { useList } from "@/utils/useList";
import { DateTime } from "luxon";
import PreorderDetailsModal from "@/components/modals/PreorderDetailsModal";
import CreditMemoDetailsModal from "@/components/modals/CreditMemoDetailsModal";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import DirectSaleDetailsModal from "@/components/modals/DirectSaleDetailsModal";
import { formatCurrency } from "@/utils/format";
import { SearchBar } from "@/components/ui/SearchBar";
import DeletePaymentsModal from "@/components/modals/DeletePaymentsModal";
import { PaginatedSelect } from "@/components/ui/PaginatedSelect";
import { StaticSelect } from "@/components/ui/StaticSelect";
import { generateAccountingPDF } from "@/utils/generateAccountingPDF";

type Order = {
  _id: string;
  number: string;
  client: { name: string, paymentTerm: string, discountPercentage: number };
  deliveredAt: string;
  vendorId: string;
  total: number;
  credits: number;
  paid: number;
  balance: number;
  computedStatus: "paid" | "pending" | "overdue" | "unpaid";
  payments: any[];
  type: "order" | "directSale" | "creditMemo";
};

export default function AccountingOrdersPage() {
  // 1. DRAFT STATES (These change instantly but do NOT trigger API)
  const [draftFrom, setDraftFrom] = useState(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [draftTo, setDraftTo] = useState(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));
  const [draftChain, setDraftChain] = useState("");
  const [draftVendor, setDraftVendor] = useState("");
  const [draftClient, setDraftClient] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 200;

  const [draftChainLabel, setDraftChainLabel] = useState("All Chains");
  const [draftVendorLabel, setDraftVendorLabel] = useState("All Vendors");
  const [draftClientLabel, setDraftClientLabel] = useState("All Clients");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 2. APPLIED STATES (Clicking Search updates this and triggers API)
  const [appliedQuery, setAppliedQuery] = useState({
    from: DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"),
    to: DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"),
    chain: "",
    vendor: "",
    client: ""
  });

  const [paymentInputs, setPaymentInputs] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(0);
  const [bulkMethod, setBulkMethod] = useState("check");
  const [bulkCheckNumber, setBulkCheckNumber] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");

  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [selectedDirectSale, setSelectedDirectSale] = useState<any | null>(null);
  const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
  const [loadingRow, setLoadingRow] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null> (null);
  const [message, setMessage] = useState("");
  const [orderToDeletePayments, setOrderToDeletePayments] = useState<Order | null>(null);
  
  // API Call - Notice we ONLY pass appliedQuery values, and we omit status/search!
  const { items: fetchedOrders, meta, loading, reload } = useList("/api/accounting/orders", {
    from: appliedQuery.from,
    to: appliedQuery.to,
    chain: appliedQuery.chain !== "all" ? appliedQuery.chain : undefined,
    client: appliedQuery.client !== "all" ? appliedQuery.client: undefined,
    vendor: appliedQuery.vendor !== "all" ? appliedQuery.vendor : undefined,
    limit: 1000,
  });

  const [localOrders, setLocalOrders] = useState<any[]>([]);
  useEffect(() => {
    if(fetchedOrders) setLocalOrders(fetchedOrders);
  }, [fetchedOrders]);

  const orders = useMemo<Order[]>(() => {
    // 1. Map data
    const mappedOrdersAndSales = (localOrders || []).map((item: any) => ({
      ...item,
      type: item.source === "directSale" ? "directSale" : "order", 
    }));
    const creditMemos = (meta.unlinkedCreditMemos || []).map((cm: any) => ({
      _id: cm._id,
      number: cm.number,
      client: { 
        _id: cm.client._id, 
        name: cm.client?.clientName || "No Client", 
        chain: cm.client?.chain,
        dueDays: cm.client?.dueDays,
      },
      deliveredAt: cm.returnedAt,
      vendorId: cm.vendorId,
      total: 0,
      credits: -cm.total || 0,
      paid: 0,
      balance: cm.paymentProcessed ? 0 : (-cm.total || 0),
      computedStatus: cm.paymentProcessed ? "paid" : "pending",
      payments: [],
      type: "creditMemo",
    }));

    let combined = [...mappedOrdersAndSales, ...creditMemos];

    // 2. CLIENT-SIDE STATUS FILTER (Instant!)
    if (status !== "all") {
      combined = combined.filter(o => {
        if (o.computedStatus === status) return true;
        
        if (status === "unpaid" && o.type === "creditMemo" && o.computedStatus === "pending" && o.client?.dueDays === 0) {
          return true;
        }

        if (status === "overdue" && o.type === "creditMemo" && o.computedStatus === "pending" && o.client?.dueDays > 0) {
          // 1. Get the returnedAt date in milliseconds
          const returnDateMillis = new Date(o.deliveredAt).getTime(); 
          
          // 2. Calculate the due date (dueDays * 86,400,000 milliseconds)
          const dueDaysMillis = o.client.dueDays * 86400000;
          const dueDateMillis = returnDateMillis + dueDaysMillis;

          // 3. It is OVERDUE if right now is PAST (>) the due date
          if (DateTime.now().toMillis() > dueDateMillis) {
              return true;
          }
          return false;
        }
        
        return false;
    });
  }

    // 3. CLIENT-SIDE 
    // SEARCH FILTER (Instant!)
    if (search.trim()) {
        const lowerSearch = search.toLowerCase();
        combined = combined.filter(o => 
            o.number?.toLowerCase().includes(lowerSearch) || 
            o.client?.name?.toLowerCase().includes(lowerSearch)
        );
    }

    // Chain Filter
    if (draftChain && draftChain !== "all") {
      combined = combined.filter(o => o.client?.chain === draftChain);
    }

    // Client Filter
    if (draftClient && draftClient !== "all") {
        combined = combined.filter(o => o.client?._id === draftClient);
    }

    // Vendor Filter
    if (draftVendor && draftVendor !== "all") {
        combined = combined.filter(o => o.vendorId === draftVendor);
    }

    // Date Filters
    if (draftFrom) {
        const fromTime = new Date(draftFrom + "T00:00:00").getTime();
        combined = combined.filter(o => new Date(o.deliveredAt).getTime() >= fromTime);
    }
    if (draftTo) {
        const toTime = new Date(draftTo + "T23:59:59.999").getTime();
        combined = combined.filter(o => new Date(o.deliveredAt).getTime() <= toTime);
    }

    // 4. Sort and return
    return combined.sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );
  }, [localOrders, meta.unlinkedCreditMemos, status, search, draftChain, draftClient, draftVendor, draftFrom, draftTo]);

  const executeSearch = () => {
      setAppliedQuery({
          from: draftFrom,
          to: draftTo,
          chain: draftChain,
          vendor: draftVendor,
          client: draftClient
      });
  };

  const resetFilters = () => {
    setDraftChain("");
    setDraftVendor("");
    setDraftClient("");
    setDraftChainLabel("All Chains");
    setDraftVendorLabel("All Vendors");
    setDraftClientLabel("All Clients");
    setStatus("all");
    setSearch("");
  };

  const handlePay = async (order: Order) => {
    const input = paymentInputs[order._id];
    if (!input || !input.amount) return;
    
    setSubmitStatus("loading");
    
    const amountNum = Number(input.amount);
    const discountNum = Number(input.discount || 0);

    const res = await fetch("/api/accounting/bulk-pay", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderIds: order.type === "order" ? [order._id] : [],
        dsIds: order.type === "directSale" ? [order._id] : [],
        cmIds: [], 
        method: input.method,
        checkNumber: input.method === "check" ? input.checkNumber : undefined,
        totalAmount: Number(amountNum),
        discountPercent: discountNum
      }),
    });

    if (res.ok) {
      setSubmitStatus("success");
      setMessage("Payment saved!");

      const discountValue = discountNum > 0 ? (order.balance * (discountNum / 100)): 0;
      const newPaymentsToAdd: { _id: string; type: any; amount: number; checkNumber?: any; }[] = [];

      if (discountValue > 0) {
        newPaymentsToAdd.push({_id: `temp-disc-${Date.now()}`, type: "discount", amount: discountValue });
      }

      newPaymentsToAdd.push({
        _id: `temp-${Date.now()}`,
        type: input.method,
        amount: amountNum,
        checkNumber: input.method === "check" ? input.checkNumber : undefined
      });

      const totalDeduction = amountNum + discountValue;
      const newPaid = (order.paid || 0) + totalDeduction;
      const newBalance = Math.max((order.balance || 0) - totalDeduction, 0);
      
      // If balance is 0 (or close enough for floating point math), mark it paid!
      const newStatus = newBalance <= 0.01 ? "paid" : order.computedStatus;

      setLocalOrders(prev => prev.map(o => {
        if (o._id === order._id) {
            return {
                ...o,
                payments: [...(o.payments || []), ...newPaymentsToAdd],
                paid: newPaid,
                balance: newBalance,
                computedStatus: newStatus
            };
        }
        return o;
    }));
      // Clear the input fields for this row
      setPaymentInputs(prev => ({ ...prev, [order._id]: {} }));
      
      // Notice: We completely deleted reload() here!
    } else {
      setSubmitStatus("error");
      setMessage("Error saving payment!");
    }
  };

  const handleBulkPay = async () => {
    if (!bulkAmount || isNaN(Number(bulkAmount))) {
      setSubmitStatus("info");
      setMessage("Enter a valid amount");
      return
    }

    setSubmitStatus("loading");
    const orderIds = Array.from(selectedItems).filter(id => orders.find(o => o._id === id)?.type === "order");
    const dsIds = Array.from(selectedItems).filter(id => orders.find(o => o._id === id)?.type === "directSale");
    const cmIds = Array.from(selectedItems).filter(id => orders.find(o => o._id === id)?.type === "creditMemo");

    const res = await fetch("/api/accounting/bulk-pay", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderIds,
        dsIds,
        cmIds,
        method: bulkMethod,
        checkNumber: bulkCheckNumber,
        totalAmount: Number(bulkAmount),
        discountPercent: bulkDiscount
      }),
    });

    if (res.ok) {
        setSubmitStatus("success");
        setMessage("Payments saved successfully!");
        setIsBulkModalOpen(false);
        setSelectedItems(new Set());
        setBulkAmount("");
        setBulkCheckNumber("");
        reload();
    } else {
        setSubmitStatus("error");
        setMessage("Error processing bulk payment");
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-400 text-green-800";
    if (status === "overdue") return "bg-red-400 text-red-800";
    if (status === "unpaid") return "bg-orange-400 text-orange-800";
    return "bg-yellow-400 text-yellow-800";
  };

  const totals = useMemo(() => {
    let totalOwed = 0;
    orders.forEach(o => totalOwed += o.balance);
    return { totalOwed };
  }, [orders]);

  // Bulk Modal Calculations
  const selectedRecords = orders.filter(o => selectedItems.has(o._id));
  const selectedOrdersBal = selectedRecords.filter(o => o.type === "order").reduce((acc, o) => acc + o.balance, 0);
  const selectedCMsBal = selectedRecords.filter(o => o.type === "creditMemo").reduce((acc, o) => acc + Math.abs(o.balance), 0);
  const bulkNetTotal = (selectedOrdersBal * (1 - bulkDiscount / 100)) - selectedCMsBal;

  const handleRowClick = async (o: Order) => {
    setLoadingRow(o._id);
    try {
      if (o.type === "order") {
        const res = await fetch(`/api/preOrders/${o._id}`);
        const data = await res.json();
        if (res.ok) setSelectedPreorder(data);
      } else if (o.type === "creditMemo") {
        const res = await fetch(`/api/credit-memos/${o._id}`);
        const data = await res.json();
        if (res.ok) setSelectedCreditMemo(data);
      } else if (o.type === "directSale"){
        const res = await fetch(`/api/direct-sales/${o._id}`);
        const data = await res.json();
        if (res.ok) setSelectedDirectSale(data);
      }
    } catch (err) {
      console.error("Failed to load item: ", err);
    } finally {
      setLoadingRow(null);
    }
  };

  useEffect(() => {
    if (loading) {
      setSubmitStatus((prev) => {
        // Prevent table reloads from overwriting payment Success/Error messages
        if (prev === "success" || prev === "error") return prev;
        
        setMessage("Fetching records...");
        return "loading";
      });
    } else {
      setSubmitStatus((prev) => {
        // Only clear the modal if it was specifically showing the loading state
        if (prev === "loading") return null;
        return prev;
      });
    }
  }, [loading]);

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [status, search, draftChain, draftClient, draftVendor, draftFrom, draftTo, fetchedOrders]);
  
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [orders, page]);
  return (
    <div className="p-4 space-y-4 h-full">
      <h1 className="text-3xl font-bold text-center dark:text-white">Accounting - Orders</h1>
    
      <div className="flex flex-col p-4 h-[80vh] w-[90vw] bg-(--secondary) rounded-xl">
          <div className="flex justify-end">
            <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                }}  
                className="px-2 py-2 bg-green-400 text-green-800 hover:text-white rounded-xl shadow-xl cursor-pointer hover:bg-green-800 transition-all duration:300"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
                </svg>
            </button>
          </div>
        <div className="flex flex-col w-full py-4 gap-4 justify-between items-center rounded-xl">
        <p className="border-b w-full border-(--quarteary) font-mono text-center text-xl font-bold">Filters</p>
        
        {/* TOP FILTER ROW */}
        <div className="flex flex-wrap gap-4 w-full justify-between font-mono">
            <PaginatedSelect
              endpoint="/api/chains"
              value={draftChain}
              onChange={(val, lab) => {
                setDraftChain(val);
                setDraftChainLabel(lab || "All chains");
              }}
              placeholder="All Chains"
            />
            <PaginatedSelect
              endpoint="/api/clients"
              value={draftClient}
              onChange={(val, lab) => {
                setDraftClient(val);
                setDraftClientLabel(lab || "All Clients");
              }}
              placeholder="All Clients"
              formatLabel={(v) => `${v.clientName}`}
              formatValue={(v) => v._id || ""}
            />

            <PaginatedSelect
              endpoint="/api/routes"
              value={draftVendor}
              onChange={(val, lab) => {
                setDraftVendor(val);
                setDraftVendorLabel(lab || "All Vendors");
              }}
              placeholder="All Vendors"
              params={{ type: "vendor"}}
              formatLabel={(v) => `${v.code} | ${v.user?.firstName || ""} ${v.user?.lastName || ""}`}
              formatValue={(v) => v.user?._id || ""}
            />

            <StaticSelect
              value={status}
              onChange={(val) => setStatus(val)}
              placeholder="All Statuses"
              options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Pending", value: "pending" },
                  { label: "Unpaid", value: "unpaid" },
                  { label: "Overdue", value: "overdue" },
                  { label: "Paid", value: "paid" },
              ]}
            />

            {(draftChain || draftVendor || draftClient || status !== "all") && (
              <button 
                onClick={resetFilters}
                className="text-md p-2 rounded-xl bg-red-400 text-red-800 font-bold hover:text-white hover:bg-red-800 transition-all duration-300 cursor-pointer whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
          
          {/* BOTTOM FILTER ROW - Instant Filters */}
          <div className="flex w-full gap-4 font-mono items-center">
              <DateRangePicker 
                  fromDate={draftFrom} 
                  toDate={draftTo} 
                  onChange={(f, t) => { setDraftFrom(f); setDraftTo(t); }} 
              /> 

              <SearchBar 
                  placeholder="Filter Invoice / Client..." 
                  onSearch={setSearch} 
                  debounce 
              />
              {/* The Search Button - Locks in the DB query */}
            
              <button 
                  onClick={() => {
                    executeSearch();
                  }}
                  className="bg-blue-400 text-blue-800 px-2 py-2 rounded-xl shadow-xl hover:bg-blue-800 hover:text-white transition-colors font-bold tracking-wide cursor-pointer"
              >
                  Search
              </button>

              <RefreshButton onRefresh={() => {
                  reload();
                }}
              />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl h-4/5 shadow-xl overflow-auto">
          <table className="w-full text-sm font-mono font-bold">
            <thead className="bg-(--tertiary) sticky top-0">
              <tr className="whitespace-nowrap text-center">
              <th className="p-2 w-10">
                    <input 
                        type="checkbox" 
                        onChange={(e) => {
                            // Update this to use paginatedOrders!
                            if (e.target.checked) setSelectedItems(new Set(paginatedOrders.map(o => o._id)));
                            else setSelectedItems(new Set());
                        }}
                        checked={selectedItems.size === paginatedOrders.length && paginatedOrders.length > 0}
                        className="w-8 h-8 cursor-pointer"
                    />
                </th>
                <th className="p-2 text-left">Client</th>
                <th className="p-2">Order</th>
                <th className="p-2">Date</th>
                <th className="p-2">Total</th>
                <th className="p-2">Credits</th>
                <th className="p-2">Paid</th>
                <th className="p-2">Balance</th>
                <th className="p-2">Status</th>
                <th className="p-2">Payment Term</th>
                <th className="p-2">Payment</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loading ? (
                <tr><td colSpan={11} className="text-center p-4">Loading Database...</td></tr>
              ) : (
                paginatedOrders.map((o) => (
                <tr 
                  key={o._id} 
                  onClick={() => handleRowClick(o)} 
                  className="border-t whitespace-nowrap text-center hover:bg-gray-100 cursor-pointer"
                >
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                          type="checkbox" 
                          checked={selectedItems.has(o._id)} 
                          onChange={() => toggleSelect(o._id)} 
                          className="w-8 h-8 cursor-pointer"
                      />
                  </td>
                  <td className="p-2 text-left">{o.client?.name}</td>
                  <td className="p-2">{o.number}</td>
                  <td className="p-2">{o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString() : "-"}</td>
                  <td className="p-2">{formatCurrency(o.total)}</td>
                  <td className={`p-2 ${o.credits === 0 ? "" : "text-red-600"}`}>
                      {o.credits < 0 ? formatCurrency(o.credits) : formatCurrency(-o.credits)}
                  </td>
                  <td className="p-2">{formatCurrency(o.paid)}</td>
                  <td className="font-bold p-2">{formatCurrency(o.balance)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(o.computedStatus)}`}>
                      {o.computedStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className="px-2 py-1 rounded-full text-sm font-semibold">
                      {o.client?.paymentTerm?.toUpperCase() || "-"}
                    </span>
                  </td>
                  <td className="w-150 p-2" onClick={(e) => e.stopPropagation()}>
                    {/* CREDIT MEMO SELECT */}
                    {o.type === "creditMemo" && (
                        <span className="text-gray-400 text-center capitalize">No payments</span>
                    )}

                    {/* SHOW PAYMENTS IF PAID */}
                    {(o.type === "order" || o.type === "directSale") && o.computedStatus === "paid" && (
                        <div className="flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col flex-1 text-sm text-left gap-1">
                            {o.payments && o.payments.length > 0 ? (
                                o.payments.map((p, idx) => (
                                <div key={p._id || idx} className="flex justify-center gap-10 font-bold border-b border-gray-100 last:border-0 pb-1">
                                    {p.type === "cash" && (
                                    <>
                                        <span className="w-full text-center">Cash</span>
                                        <span className="w-full text-center">-</span>
                                        <span className="w-full text-center">{formatCurrency(p.amount)}</span>
                                    </>
                                    )}
                                    {p.type === "check" && (
                                    <>
                                        <span className="w-full text-center">Check</span>
                                        <span className="w-full text-center">{p.checkNumber ? `#${p.checkNumber}` : "-"}</span>
                                        <span className="w-full text-center">{formatCurrency(p.amount)}</span>
                                    </>
                                    )}
                                    {p.type === "creditMemo" && (
                                      <>
                                        <span className="w-full text-center text-red-500">Credit</span>
                                        <span className="w-full text-center text-red-500">-</span>
                                        <span className="w-full text-center text-red-500">{formatCurrency(p.amount)}</span>
                                      </>
                                    )}
                                    {p.type === "discount" &&(
                                        <>
                                        <span className="w-full text-center text-red-500">Discount</span>
                                        <span className="w-full text-center text-red-500">Applied</span>
                                        <span className="w-full text-center text-red-500">{formatCurrency(p.amount)}</span>
                                      </>
                                    )}
                                </div>
                                ))
                            ) : (
                                <span className="text-gray-400 text-center capitalize">No payments</span>
                            )}
                            </div>
                            
                            {/* The Delete Trigger */}
                            {o.payments && o.payments.length > 0 && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOrderToDeletePayments(o);
                                    }}
                                    className="ml-4 px-4 py-2 bg-red-400 text-red-800 rounded-xl hover:bg-red-800 hover:text-white transition-colors cursor-pointer font-bold text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}

                    {/* PAYMENT INPUT FOR NON-PAID */}
                    {(o.type === "order" || o.type === "directSale") && o.computedStatus !== "paid" && (
                        <div className="flex w-full h-full items-center gap-4 justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="h-10 w-28 bg-blue-200 shadow rounded-xl">
                            <select
                            onChange={(e) =>
                                setPaymentInputs(prev => ({
                                ...prev,
                                [o._id]: {
                                    ...prev[o._id],
                                    discount: Number(e.target.value),
                                },
                                }))
                            }
                            className="w-full h-full text-gray-500"
                            >
                            <option value={0}>Discount?</option>
                            <option value={1}>1%</option>
                            <option value={2}>2%</option>
                            </select>
                        </div>

                        <div className="bg-blue-200 shadow h-10 w-24 rounded-xl">
                            <select
                            value={paymentInputs[o._id]?.method || ""}
                            onChange={(e) =>
                                setPaymentInputs(prev => ({
                                ...prev,
                                [o._id]: {
                                    ...prev[o._id],
                                    method: e.target.value,
                                },
                                }))
                            }
                            className="w-full h-full text-gray-500"
                            >
                            <option value="">Type</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="creditMemo">Credit Memo</option>
                            <option value="discount">Discount</option>
                            </select>
                        </div>

                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Amount"
                            value={paymentInputs[o._id]?.amount || ""}
                            onChange={(e) =>
                            setPaymentInputs(prev => ({
                                ...prev,
                                [o._id]: {
                                ...prev[o._id],
                                amount: e.target.value,
                                },
                            }))
                            }
                            className="bg-blue-200 shadow text-gray-500 rounded-xl px-2 w-28 h-10"
                        />

                        {paymentInputs[o._id]?.method === "check" && (
                            <input
                            type="text"
                            placeholder="Check #"
                            value={paymentInputs[o._id]?.checkNumber || ""}
                            onChange={(e) =>
                                setPaymentInputs(prev => ({
                                ...prev,
                                [o._id]: {
                                    ...prev[o._id],
                                    checkNumber: e.target.value,
                                },
                                }))
                            }
                            className="bg-blue-200 shadow text-gray-500 rounded-xl h-10 px-2 w-24"
                            />
                        )}

                        <button
                            onClick={() => handlePay(o)}
                            className="bg-green-400 text-green-800 hover:text-white h-10 px-4 py-2 rounded-xl cursor-pointer hover:bg-green-800 transition-all duration:300"
                        >
                            Pay
                        </button>
                        </div>
                    )}
                    </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-center text-gray-800">Export Report</h2>
              <p className="text-gray-600 text-sm text-center">
                  You are about to generate a PDF report of <span className="font-bold text-blue-600">{orders.length}</span> records with the following filters applied:
              </p>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm flex flex-col gap-3 font-mono">
                  <div className="flex justify-between"><span className="font-bold text-gray-500">Date Range:</span> <span>{draftFrom || "Any"} to {draftTo || "Any"}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-gray-500">Status:</span> <span>{status === "all" ? "All Statuses" : status.toUpperCase()}</span></div>
                  {draftChain && <div className="flex justify-between"><span className="font-bold text-gray-500">Chain:</span> <span>{draftChainLabel}</span></div>}
                  {draftClient && <div className="flex justify-between"><span className="font-bold text-gray-500">Client:</span> <span>{draftClientLabel}</span></div>}
                  {draftVendor && <div className="flex justify-between"><span className="font-bold text-gray-500">Vendor:</span> <span>{draftVendorLabel}</span></div>}
              </div>
              <div className="flex justify-between gap-4 mt-4">
                  <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold flex-1 transition-colors">
                      Cancel
                  </button>
                  <button 
                      onClick={() => {
                          generateAccountingPDF(orders, {
                              from: draftFrom, to: draftTo, status, 
                              chain: draftChainLabel, client: draftClientLabel, vendor: draftVendorLabel
                          });
                          setIsExportModalOpen(false);
                      }} 
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex-1 transition-colors flex justify-center items-center gap-2"
                  >
                      Confirm Export
                  </button>
              </div>
          </div>
      </div>
        )}
        <div className="mt-4 font-bold font-mono flex justify-between items-center">
        <button 
                onClick={() => setIsBulkModalOpen(true)}
                disabled={selectedItems.size === 0}
                className={`bg-green-400 text-green-800 p-1 rounded-xl 
                  disabled:bg-gray-400 disabled:text-gray-800 hover:bg-green-800 hover:text-white
                  transition-colors ${selectedItems.size === 0 ? "" : "cursor-pointer"}`}
            >
                Bulk Pay ({selectedItems.size})
            </button>
          <div className={`p-2 rounded-xl ${totals.totalOwed > 0 ? "text-red-800 bg-red-400" : "text-green-800 bg-green-400"}`}>Total Owed: {formatCurrency(totals.totalOwed)}</div>
          <div className="flex justify-end font-mono font-bold items-center gap-4">
        <span>
        Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, orders.length)} of {orders.length} entries
        </span>
        <button
          disabled={page === 1}
          onClick={() => {
            handleSetPage("back");
            setTimeout(() => {setSubmitStatus(null);}, 1000);
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
            setTimeout(() => {setSubmitStatus(null);}, 1000);
          }}
          className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
        </div>
      </div>

      {/* BULK PAYMENT MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-[600px] max-w-[95vw] max-h-[80vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 border-b pb-2 text-center">Process Bulk Payment</h2>
                
                <div className="flex-1 overflow-auto mb-4 rounded-xl p-2 bg-(--secondary)">
                    {selectedRecords.map(record => (
                        <div key={record._id} className="flex justify-between items-center p-3 bg-white mb-1 rounded-lg">
                            <div>
                                <span className="font-bold">{record.number}</span>
                                <span className="text-sm text-gray-500 ml-2">({record.client.name})</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono ${record.type === 'creditMemo' ? 'text-red-500' : ''}`}>
                                    ${Math.abs(record.balance).toFixed(2)}
                                </span>
                                <button onClick={() => toggleSelect(record._id)} className="text-white bg-red-500 px-2 py-2 text-sm rounded-xl hover:underline hover:bg-red-300 cursor-pointer transition-all duration-300">
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-(--secondary) p-4 rounded-xl mb-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-600 text-center">Applied Discount</label>
                        <select 
                            value={bulkDiscount} 
                            onChange={(e) => setBulkDiscount(Number(e.target.value))}
                            className="bg-white p-3 h-10 rounded-xl"
                        >
                            <option value={0}>0%</option>
                            <option value={1}>1%</option>
                            <option value={2}>2%</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 text-right justify-center">
                        <div className="text-md text-gray-600">Subtotal: ${selectedOrdersBal.toFixed(2)}</div>
                        <div className="text-md text-red-500">Credits: -${selectedCMsBal.toFixed(2)}</div>
                        <div className="text-lg font-bold border-t">New Net: ${Math.max(bulkNetTotal, 0).toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    <select 
                        value={bulkMethod} 
                        onChange={(e) => setBulkMethod(e.target.value)} 
                        className="bg-white p-2 rounded-xl w-1/3"
                    >
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                    </select>
                    {bulkMethod === "check" && (
                        <input 
                            type="text" 
                            placeholder="Check #" 
                            value={bulkCheckNumber} 
                            onChange={(e) => setBulkCheckNumber(e.target.value)} 
                            className="bg-white p-2 rounded-xl w-1/3"
                        />
                    )}
                    <input 
                        type="number" 
                        placeholder="Amount" 
                        value={bulkAmount} 
                        onChange={(e) => setBulkAmount(e.target.value)} 
                        className="bg-white p-2 rounded-xl flex-1"
                    />
                </div>

                <div className="flex justify-between gap-3 border-t pt-4">
                    <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button onClick={handleBulkPay} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors cursor-pointer">
                        Process Payment
                    </button>
                </div>
            </div>
        </div>
      )}
      {/* Preorder Details Modal */}
      {selectedPreorder && (
          <PreorderDetailsModal
              preorder={selectedPreorder}
              onClose={() => setSelectedPreorder(null)}
              userRole="admin"
              onEdit={selectedPreorder}
          />
      )}

      {/* Direct Sale Details Modal */}
      {selectedDirectSale && (
          <DirectSaleDetailsModal
            directSale={selectedDirectSale}
            onClose={() => setSelectedDirectSale(null)}
          />
      )}

      {/* Credit Memo Details Modal */}
      {selectedCreditMemo && (
          <CreditMemoDetailsModal
              creditMemo={selectedCreditMemo}
              onClose={() => setSelectedCreditMemo(null)}
              onEdit={selectedCreditMemo}
          />
      )}
      {submitStatus && (
        <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => {
                setMessage("");
                setSubmitStatus(null);
            }}
            collection="Accounting"
        />
      )}
      {/* Delete payments modal */}
      { orderToDeletePayments && (
          <DeletePaymentsModal
            order={orderToDeletePayments}
            onClose={() => setOrderToDeletePayments(null)}
            onCompleted={() => {
              setOrderToDeletePayments(null);
              reload(); // <--- Since reload() triggers useList, it will pull the fresh DB state using appliedQuery
            }}
          />
      )}
    </div>
  );
}