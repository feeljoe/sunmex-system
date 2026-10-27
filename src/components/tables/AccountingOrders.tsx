"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
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
import { useSidebar } from "@/app/components/SideBarContext";
import { SingleDatePicker } from "../ui/SingleDatePicker";
import { motion, AnimatePresence } from "framer-motion";

type Order = {
  _id: string;
  number: string;
  client: { _id: string, name: string, paymentTerm: string, discountPercentage: number, chain: string, dueDays: number };
  deliveredAt: string;
  paidAt?: string | null;
  paymentStatus?: "pending" | "paid";
  vendorId: string;
  total: number;
  credits: number;
  paid: number;
  balance: number;
  computedStatus: "paid" | "pending" | "overdue" | "unpaid";
  payments: any[];
  type: "order" | "directSale" | "creditMemo";
};

type PaymentDateEdit = {
  orderId: string;
  orderType: "order" | "directSale";
  orderNumber: string;
  paymentId: string;
  paymentType: string;
  amount: number;
  originalDate: string | null;
};

export default function AccountingOrdersTable({ userRole }: { userRole: string; }) {
  const { sidebarOpen } = useSidebar();

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

  const todayPhoenix = () => DateTime.now().setZone("America/Phoenix").toFormat("yyyy-MM-dd");
  const [bulkPaymentDate, setBulkPaymentDate] = useState(todayPhoenix);
  const [orderToPay, setOrderToPay] = useState<Order | null>(null);
  const [singlePaymentDate, setSinglePaymentDate] = useState(todayPhoenix);
  const [expandedPaymentRows, setExpandedPaymentRows] = useState<Set<string>>(() => new Set());
  const [paymentDateEdit, setPaymentDateEdit] = useState<PaymentDateEdit | null>(null);
  const [editedPaymentDate, setEditedPaymentDate] = useState("");
  const [confirmDateUpdate, setConfirmDateUpdate] = useState(false);
  const [updatingPaymentDate, setUpdatingPaymentDate] = useState(false);
  const [paymentDateError, setPaymentDateError] = useState("");

  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [selectedDirectSale, setSelectedDirectSale] = useState<any | null>(null);
  const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
  const [loadingRow, setLoadingRow] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
  const [message, setMessage] = useState("");
  const [orderToDeletePayments, setOrderToDeletePayments] = useState<Order | null>(null);

  // API Call - Notice we ONLY pass appliedQuery values, and we omit status/search!
  const { items: fetchedOrders, meta, loading, reload } = useList("/api/accounting/orders", {
    from: appliedQuery.from,
    to: appliedQuery.to,
    chain: appliedQuery.chain !== "all" ? appliedQuery.chain : undefined,
    client: appliedQuery.client !== "all" ? appliedQuery.client : undefined,
    vendor: appliedQuery.vendor !== "all" ? appliedQuery.vendor : undefined,
    limit: 1000,
  });

  const togglePaymentHistory = (orderId: string) => {
    setExpandedPaymentRows(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const openPaymentDateEditor = (order: Order, payment: any) => {
    setPaymentDateEdit({
      orderId: order._id,
      orderType: order.type === "directSale" ? "directSale" : "order",
      orderNumber: order.number,
      paymentId: String(payment._id),
      paymentType: payment.type,
      amount: Number(payment.amount),
      originalDate: payment.paidAt || null,
    });
    const currentDate = payment.paidAt
      ? DateTime.fromISO(payment.paidAt).setZone("America/Phoenix").toFormat("yyyy-MM-dd")
      : todayPhoenix();
    setEditedPaymentDate(currentDate);
    setConfirmDateUpdate(false);
    setPaymentDateError("");
  };

  const handleUpdatePaymentDate = async () => {
    if (!paymentDateEdit || updatingPaymentDate) return;
    setUpdatingPaymentDate(true);
    setPaymentDateError("");
    try {
      const res = await fetch("/api/accounting/payments/update-date", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: paymentDateEdit.orderId,
          orderType: paymentDateEdit.orderType,
          paymentId: paymentDateEdit.paymentId,
          paymentDate: editedPaymentDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to update payment date.");
      }
      setLocalOrders(prev =>
        prev.map(order => {
          if (String(order._id) !== paymentDateEdit.orderId) {
            return order;
          }
          return {
            ...order,
            paidAt: data.invoicePaidAt,
            payments: (order.payments || []).map((payment: any) => {
              if (String(payment._id) !== paymentDateEdit.paymentId) {
                return payment;
              }
              return {
                ...payment,
                paidAt: data.paidAt,
                dateUpdatedBy: data.dateUpdatedBy,
                dateUpdatedAt: data.dateUpdatedAt,
              };
            }),
          };
        })
      );
      setPaymentDateEdit(null);
      setConfirmDateUpdate(false);
      setSubmitStatus("success");
      setMessage("Payment Date updated successfully");
    } catch (error: any) {
      setPaymentDateError(error.message || "Failed to update payment date");
      setSubmitStatus("error");
      setMessage(error.message || "Failed to update payment date");
    } finally {
      setUpdatingPaymentDate(false);
    }
  }

  const [localOrders, setLocalOrders] = useState<any[]>([]);
  useEffect(() => {
    if (fetchedOrders) setLocalOrders(fetchedOrders);
  }, [fetchedOrders]);

  const orders = useMemo<Order[]>(() => {
    // 1. Map data
    const mappedOrdersAndSales = (localOrders || []).map((item: any) => ({
      ...item,
      type: item.source === "directSale" ? "directSale" : "order",
    }));
    const creditMemos = (meta?.unlinkedCreditMemos || []).map((cm: any) => ({
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
          const returnDateMillis = new Date(o.deliveredAt).getTime();
          const dueDaysMillis = o.client.dueDays * 86400000;
          const dueDateMillis = returnDateMillis + dueDaysMillis;

          if (DateTime.now().toMillis() > dueDateMillis) {
            return true;
          }
          return false;
        }

        return false;
      });
    }

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      combined = combined.filter(o =>
        o.number?.toLowerCase().includes(lowerSearch) ||
        o.client?.name?.toLowerCase().includes(lowerSearch)
      );
    }

    if (draftChain && draftChain !== "all") {
      combined = combined.filter(o => o.client?.chain === draftChain);
    }

    if (draftClient && draftClient !== "all") {
      combined = combined.filter(o => o.client?._id === draftClient);
    }

    if (draftVendor && draftVendor !== "all") {
      combined = combined.filter(o => o.vendorId === draftVendor);
    }

    if (draftFrom) {
      const fromTime = new Date(draftFrom + "T00:00:00").getTime();
      combined = combined.filter(o => new Date(o.deliveredAt).getTime() >= fromTime);
    }
    if (draftTo) {
      const toTime = new Date(draftTo + "T23:59:59.999").getTime();
      combined = combined.filter(o => new Date(o.deliveredAt).getTime() <= toTime);
    }

    return combined.sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );
  }, [localOrders, meta?.unlinkedCreditMemos, status, search, draftChain, draftClient, draftVendor, draftFrom, draftTo]);

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

  const handlePay = async (order: Order, paymentDate: string) => {
    const input = paymentInputs[order._id];
    if (!input || !input.amount || !input.method) return;

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
        discountPercent: discountNum,
        paymentDate
      }),
    });

    if (res.ok) {
      setSubmitStatus("success");
      setMessage("Payment saved!");

      const discountValue = discountNum > 0 ? (order.balance * (discountNum / 100)) : 0;
      const newPaymentsToAdd: { _id: string; type: any; amount: number; checkNumber?: any; paidAt?: string }[] = [];

      if (discountValue > 0) {
        newPaymentsToAdd.push({ _id: `temp-disc-${Date.now()}`, type: "discount", amount: discountValue, paidAt: paymentDate });
      }

      newPaymentsToAdd.push({
        _id: `temp-${Date.now()}`,
        type: input.method,
        amount: amountNum,
        checkNumber: input.method === "check" ? input.checkNumber : undefined,
        paidAt: paymentDate,
      });

      const totalDeduction = amountNum + discountValue;
      const newPaid = (order.paid || 0) + totalDeduction;
      const newBalance = Math.max((order.balance || 0) - totalDeduction, 0);

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
      setPaymentInputs(prev => ({ ...prev, [order._id]: {} }));
      setOrderToPay(null);
    } else {
      setSubmitStatus("error");
      setMessage("Error saving payment!");
    }
  };

  const handleBulkPay = async () => {
    if (!bulkAmount || isNaN(Number(bulkAmount))) {
      setSubmitStatus("info");
      setMessage("Enter a valid amount");
      return;
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
        discountPercent: bulkDiscount,
        paymentDate: bulkPaymentDate,
      }),
    });

    if (res.ok) {
      let remainingCash = Number(bulkAmount) || 0;

      // Group explicitly selected UI CMs by Chain / Client ID for Optimistic UI
      const creditPool: Record<string, number> = {};
      Array.from(selectedItems).forEach(id => {
        const o = orders.find(ord => ord._id === id);
        if (o && o.type === "creditMemo") {
          const poolKey = o.client.chain || o.client._id;
          creditPool[poolKey] = (creditPool[poolKey] || 0) + Math.abs(o.balance || o.credits);
        }
      });

      setLocalOrders(prev => prev.map(o => {
        if (selectedItems.has(o._id)) {

          if (o.type === "creditMemo") {
            return { ...o, computedStatus: "paid", balance: 0, paid: Math.abs(o.credits), paidAt: bulkPaymentDate };
          }

          const discountAmount = o.total * (bulkDiscount / 100);
          const newPaymentsToAdd: any[] = [];

          if (discountAmount > 0) {
            newPaymentsToAdd.push({ _id: `temp-disc-${Date.now()}-${o._id}`, type: "discount", amount: discountAmount, paidAt: bulkPaymentDate });
          }

          let currentBalance = Math.max((o.balance || 0) - discountAmount, 0);
          const poolKey = o.client.chain || o.client._id;

          // Apply Unlinked Credits from this Client/Chain's pool
          if (currentBalance > 0 && creditPool[poolKey] > 0) {
            const applyCredit = Math.min(currentBalance, creditPool[poolKey]);
            newPaymentsToAdd.push({ _id: `temp-cm-${Date.now()}-${o._id}`, type: "creditMemo", amount: applyCredit, paidAt: bulkPaymentDate });
            creditPool[poolKey] -= applyCredit;
            currentBalance -= applyCredit;
          }

          // Apply Cash/Check
          if (currentBalance > 0 && remainingCash > 0) {
            const applyCash = Math.min(currentBalance, remainingCash);
            newPaymentsToAdd.push({
              _id: `temp-cash-${Date.now()}-${o._id}`,
              type: bulkMethod,
              amount: applyCash,
              checkNumber: bulkMethod === "check" ? bulkCheckNumber : undefined,
              paidAt: bulkPaymentDate,
            });
            remainingCash -= applyCash;
            currentBalance -= applyCash;
          }

          const totalDeducted = (o.balance || 0) - currentBalance;
          const newPaid = (o.paid || 0) + totalDeducted;
          const newStatus = currentBalance <= 0.01 ? "paid" : o.computedStatus;

          return {
            ...o,
            payments: [...(o.payments || []), ...newPaymentsToAdd],
            paid: newPaid,
            balance: currentBalance,
            computedStatus: newStatus
          };
        }
        return o;
      }));

      setSubmitStatus("success");
      setMessage("Payments saved successfully!");
      setIsBulkModalOpen(false);
      setSelectedItems(new Set());
      setBulkAmount("");
      setBulkCheckNumber("");
      setBulkPaymentDate(todayPhoenix());
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

  const selectedRecords = orders.filter(o => selectedItems.has(o._id));
  const selectedOrdersBal = selectedRecords.filter(o => o.type === "order" || o.type === "directSale").reduce((acc, o) => acc + o.balance, 0);
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
      } else if (o.type === "directSale") {
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
        if (prev === "success" || prev === "error") return prev;
        setMessage("Fetching records...");
        return "loading";
      });
    } else {
      setSubmitStatus((prev) => {
        if (prev === "loading") return null;
        return prev;
      });
    }
  }, [loading]);

  const handleSetPage = (value: string) => {
    setSubmitStatus("loading");
    if (value === "back") {
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
    <div className={`flex flex-col p-2 bg-(--secondary) rounded-xl transition-all duration-300 ease-in-out ${sidebarOpen ? "md:w-[84vw]" : "md:w-[94vw]"} w-[94vw] h-[75vh] md:h-[86vh]`}>
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
            params={{ type: "vendor" }}
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
          <thead className="bg-(--tertiary) sticky top-0 z-10">
            <tr className="whitespace-nowrap text-center">
              <th className="p-2 w-10">
                <input
                  type="checkbox"
                  onChange={(e) => {
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


                    {/* ================================================
    PAYMENT HISTORY + PAYMENT INPUTS
================================================ */}

                    {(o.type === "order" || o.type === "directSale") && (

                      <div
                        className="flex flex-col w-full gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >


                        {/* ==========================================
    1. COLLAPSIBLE PAYMENT HISTORY
========================================== */}

                        {o.payments && o.payments.length > 0 && (

                          <div className="flex flex-col w-full border-b border-gray-300 pb-2">

                            {/* ALWAYS VISIBLE HEADER */}

                            <div className="flex items-center justify-between gap-3">

                              {/* EXPAND / COLLAPSE BUTTON */}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePaymentHistory(o._id);
                                }}
                                aria-expanded={expandedPaymentRows.has(o._id)}
                                className="flex items-center gap-2 text-gray-700 hover:text-blue-700 cursor-pointer font-bold text-sm"
                              >

                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2.5}
                                  stroke="currentColor"
                                  className={`size-5 transition-transform duration-300 ease-in-out ${expandedPaymentRows.has(o._id)
                                    ? "rotate-90"
                                    : ""
                                    }`}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m9 18 6-6-6-6"
                                  />
                                </svg>

                                <span>
                                  Payment History ({o.payments.length})
                                </span>

                              </button>

                              {/* TOTAL PAID + DELETE BUTTON */}

                              <div className="flex items-center gap-3">

                                <span className="text-xs text-gray-500 font-bold">
                                  {formatCurrency(o.paid || 0)}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOrderToDeletePayments(o);
                                  }}
                                  title="Delete Payments"
                                  className="p-2 bg-red-400 text-red-800 rounded-xl hover:bg-red-800 hover:text-white transition-colors cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                </button>

                              </div>

                            </div>

                            {/* EXPANDABLE PAYMENT LIST */}
                            <AnimatePresence initial={false}>
                            {expandedPaymentRows.has(o._id) && (
                              <motion.div
                                key={`payment-history-${o._id}`}
                                initial={{height: 0, opacity: 0,}}
                                animate={{height: "auto", opacity: 1,}}
                                exit={{height:0, opacity:0 }}
                                transition={{
                                  height: {
                                    duration: 0.3,
                                    ease: [0.25, 0.1, 0.25, 1],
                                  },
                                  opacity: {
                                    duration: 0.2,
                                    ease: "easeInOut",
                                  },
                                }}
                                style={{
                                  overflow: "hidden"
                                }}
                                className="w-full">
                              <div className="flex flex-col gap-2 mt-3">

                                {o.payments.map((p, idx) => (

                                  <button
                                    key={p._id || idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPaymentDateEditor(o, p);
                                    }}
                                    title="Click to edit payment date"
                                    className="cursor-pointer flex flex-col gap-1 bg-gray-50 hover:bg-blue-300 rounded-lg p-2 border border-gray-200 transition-colors"
                                  >

                                    <div className="flex items-center justify-between gap-3">

                                      {/* PAYMENT TYPE */}

                                      <span
                                        className={`font-bold ${p.type === "creditMemo" ||
                                          p.type === "discount"
                                          ? "text-red-500"
                                          : "text-gray-700"
                                          }`}
                                      >
                                        {p.type === "cash" && "Cash"}

                                        {p.type === "check" &&
                                          `Check${p.checkNumber ? ` #${p.checkNumber}` : ""}`}

                                        {p.type === "creditMemo" && "Credit Memo"}

                                        {p.type === "discount" && "Discount"}
                                      </span>

                                      {/* AMOUNT */}

                                      <span
                                        className={`font-bold ${p.type === "creditMemo" ||
                                          p.type === "discount"
                                          ? "text-red-500"
                                          : "text-gray-800"
                                          }`}
                                      >
                                        {formatCurrency(p.amount)}
                                      </span>

                                    </div>

                                    {/* PAYMENT DATE */}

                                    <div className="flex justify-between items-center gap-2 text-xs text-gray-500">
                                      <div className="flex gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                                        </svg>
                                        <span>
                                          {p.paidAt
                                            ? `Paid: ${DateTime.fromISO(p.paidAt)
                                              .setZone("America/Phoenix")
                                              .toFormat("MM/dd/yyyy")}`
                                            : "Payment date unavailable"}
                                        </span>
                                      </div>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                      </svg>
                                    </div>
                                  </button>

                                ))}

                              </div>
                              </motion.div>
                            )}
                            </AnimatePresence>
                          </div>

                        )}


                        {/* ==========================================
      2. PAYMENT INPUTS
      Only visible if NOT fully paid
  ========================================== */}

                        {o.computedStatus !== "paid" && (

                          <div className="flex flex-col gap-3 w-full">

                            {/* SHOW BALANCE IF PAYMENTS EXIST */}

                            {o.payments && o.payments.length > 0 && (

                              <div className="flex items-center justify-between bg-yellow-100 text-yellow-900 px-3 py-2 rounded-lg text-sm font-bold">

                                <span>Remaining Balance</span>

                                <span>{formatCurrency(o.balance)}</span>

                              </div>

                            )}

                            {/* PAYMENT INPUT ROW */}

                            <div className="flex flex-wrap w-full items-center gap-3 justify-between">

                              {/* DISCOUNT */}

                              <div className="h-10 w-24 bg-blue-200 shadow rounded-xl">

                                <select
                                  value={paymentInputs[o._id]?.discount || 0}
                                  onChange={(e) =>
                                    setPaymentInputs(prev => ({
                                      ...prev,
                                      [o._id]: {
                                        ...prev[o._id],
                                        discount: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full h-full text-gray-500 cursor-pointer text-center font-bold outline-none"
                                >
                                  <option value={0}>Disc?</option>
                                  <option value={1}>1%</option>
                                  <option value={2}>2%</option>
                                </select>

                              </div>

                              {/* PAYMENT METHOD */}

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
                                  className="w-full h-full text-gray-500 font-bold text-center outline-none cursor-pointer"
                                >
                                  <option value="">Type</option>
                                  <option value="cash">Cash</option>
                                  <option value="check">Check</option>
                                </select>

                              </div>

                              {/* AMOUNT */}

                              <input
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
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
                                className="bg-blue-200 shadow text-gray-700 font-bold rounded-xl px-2 w-28 h-10 outline-none"
                              />

                              {/* CHECK NUMBER */}

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
                                  className="bg-blue-200 shadow text-gray-700 font-bold rounded-xl h-10 px-2 w-24 outline-none"
                                />

                              )}

                              {/* PAY BUTTON */}

                              <button
                                disabled={
                                  !paymentInputs[o._id]?.method ||
                                  !paymentInputs[o._id]?.amount ||
                                  Number(paymentInputs[o._id]?.amount) <= 0
                                }
                                onClick={() => {
                                  setSinglePaymentDate(todayPhoenix());
                                  setOrderToPay(o);
                                }}
                                className="bg-green-400 text-green-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed h-10 px-4 py-2 rounded-xl cursor-pointer hover:bg-green-800 transition-all duration-300 font-bold"
                              >
                                Pay
                              </button>

                            </div>

                          </div>

                        )}

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
          onClick={() => {
            setBulkPaymentDate(todayPhoenix());
            setIsBulkModalOpen(true);
          }}
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
              setTimeout(() => { setSubmitStatus(null); }, 1000);
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
              setTimeout(() => { setSubmitStatus(null); }, 1000);
            }}
            className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* INDIVIDUAL PAYMENT CONFIRMATION MODAL */}
      {orderToPay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4 font-mono">

            <h2 className="text-xl font-bold text-center border-b pb-3">
              Confirm Payment
            </h2>

            <div className="bg-(--secondary) p-4 rounded-xl flex flex-col gap-2">

              <div className="flex justify-between">
                <span className="font-bold">Invoice:</span>
                <span>{orderToPay.number}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="font-bold">Client:</span>
                <span className="text-right">
                  {orderToPay.client?.name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-bold">Amount:</span>
                <span className="text-green-700 font-bold">
                  {formatCurrency(
                    Number(
                      paymentInputs[orderToPay._id]?.amount || 0
                    )
                  )}
                </span>
              </div>

            </div>

            <div className="flex flex-col gap-2">

              <label className="font-bold text-sm text-center">
                Date Payment Was Received
              </label>

              <SingleDatePicker
                text="Select Payment Date"
                value={singlePaymentDate}
                onChange={setSinglePaymentDate}
                reason="accounting"
              />

              <p className="text-xs text-gray-500 text-center">
                Defaults to today. Change it if the payment
                was received on a different date.
              </p>

            </div>

            <div className="flex justify-between gap-4 border-t pt-4">

              <button
                onClick={() => setOrderToPay(null)}
                className="px-4 py-2 bg-gray-300 rounded-xl font-bold hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  handlePay(orderToPay, singlePaymentDate)
                }
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 cursor-pointer"
              >
                Confirm Payment
              </button>

            </div>

          </div>

        </div>
      )}


      {/* ===========================================
    PAYMENT DATE EDIT MODAL
=========================================== */}

      {paymentDateEdit && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-2 font-mono">

            {!confirmDateUpdate ? (

              <>
                <h2 className="flex bg-(--tertiary) rounded-t-2xl items-center justify-center p-2 gap-2 text-xl font-bold text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                  </svg>
                  Edit Payment Date
                </h2>
                <div className="p-2">
                <div className="bg-blue-100 p-2 rounded-xl flex flex-col gap-1">

                  <div className="flex justify-between">
                    <span className="font-bold">Invoice:</span>
                    <span>{paymentDateEdit.orderNumber}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Type:</span>
                    <span className="capitalize">
                      {paymentDateEdit.paymentType}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Amount:</span>
                    <span>
                      {formatCurrency(paymentDateEdit.amount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Current Date:</span>

                    <span>
                      {paymentDateEdit.originalDate
                        ? DateTime.fromISO(
                          paymentDateEdit.originalDate
                        )
                          .setZone("America/Phoenix")
                          .toFormat("MM/dd/yyyy")
                        : "Not recorded"}
                    </span>
                  </div>

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-bold text-center">
                    New Payment Date
                  </label>

                  <SingleDatePicker
                    text="Select New Payment Date"
                    value={editedPaymentDate}
                    onChange={setEditedPaymentDate}
                    reason="accounting"
                  />

                </div>

                <div className="flex justify-between pt-2">

                  <button
                    type="button"
                    onClick={() => setPaymentDateEdit(null)}
                    className="p-2 rounded-xl bg-gray-300 hover:bg-gray-700 hover:text-white font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentDateError("");
                      setConfirmDateUpdate(true);
                    }}
                    disabled={!editedPaymentDate}
                    className="p-2 rounded-xl bg-blue-400 hover:bg-blue-800 text-blue-800 hover:text-white disabled:opacity-50 font-bold cursor-pointer transition-colors"
                  >
                    Update Date
                  </button>

                </div>
                </div>
              </>

            ) : (

              <>
                <h2 className="text-xl font-bold text-center">
                  Confirm Date Change
                </h2>

                <p className="text-sm text-center text-gray-700">
                  Are you sure you want to change the
                  recorded date for this payment?
                </p>

                <div className="bg-(--secondary) p-4 rounded-xl flex flex-col gap-3">

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">Previous:</span>

                    <span className="text-red-700">
                      {paymentDateEdit.originalDate
                        ? DateTime.fromISO(
                          paymentDateEdit.originalDate
                        )
                          .setZone("America/Phoenix")
                          .toFormat("MM/dd/yyyy")
                        : "Not recorded"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">New:</span>

                    <span className="text-green-700">
                      {DateTime.fromISO(editedPaymentDate)
                        .toFormat("MM/dd/yyyy")}
                    </span>
                  </div>

                </div>

                <p className="text-xs text-gray-500 text-center">
                  This correction and the user making it
                  will be recorded in payment history.
                </p>

                {paymentDateError && (
                  <p className="text-red-600 text-sm text-center">
                    {paymentDateError}
                  </p>
                )}

                <div className="flex gap-3 justify-between border-t pt-4">

                  <button
                    type="button"
                    disabled={updatingPaymentDate}
                    onClick={() => {
                      setPaymentDateError("");
                      setConfirmDateUpdate(false);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 font-bold cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={updatingPaymentDate}
                    onClick={handleUpdatePaymentDate}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {updatingPaymentDate
                      ? "Saving..."
                      : "Confirm Change"}
                  </button>

                </div>
              </>

            )}

          </div>

        </div>

      )}

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
                    <span className={`font-mono font-bold ${record.type === 'creditMemo' ? 'text-red-500' : 'text-gray-700'}`}>
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
                  className="bg-white p-3 h-10 rounded-xl cursor-pointer font-bold text-center outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={1}>1%</option>
                  <option value={2}>2%</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 text-right justify-center">
                <div className="text-md font-bold text-gray-600">Subtotal: ${selectedOrdersBal.toFixed(2)}</div>
                <div className="text-md font-bold text-red-500">Credits: -${selectedCMsBal.toFixed(2)}</div>
                <div className="text-lg font-bold border-t">New Net: ${Math.max(bulkNetTotal, 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <select
                value={bulkMethod}
                onChange={(e) => setBulkMethod(e.target.value)}
                className="bg-white p-2 rounded-xl w-1/3 cursor-pointer font-bold text-gray-700 outline-none"
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
                  className="bg-white p-2 rounded-xl w-1/3 font-bold outline-none text-gray-700"
                />
              )}
              <input
                type="number"
                placeholder="Amount"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="bg-white p-2 rounded-xl flex-1 font-bold outline-none text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-2 mb-6 bg(--secondary) p-4 rounded-xl">
              <label className="text-sm font-bold text-gray-600 text-center">
                Date Payment Was Received
              </label>
              <SingleDatePicker
                text="Select Bulk Payment Date"
                value={bulkPaymentDate}
                onChange={setBulkPaymentDate}
                reason="accounting"
              />
              <p className="text-xs text-gray-500 text-center">
                The selected date will apply to all payments processed in this batch.
              </p>
            </div>

            <div className="flex justify-between gap-3 border-t pt-4">
              <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 bg-gray-300 font-bold rounded-xl hover:bg-gray-400 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleBulkPay} disabled={!bulkAmount} className="px-4 py-2 bg-green-600 font-bold disabled:opacity-50 text-white rounded-xl hover:bg-green-700 transition-colors cursor-pointer">
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
          userRole={userRole === "admin" ? "admin" : "no-access"}
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
      {orderToDeletePayments && (
        <DeletePaymentsModal
          order={orderToDeletePayments}
          onClose={() => setOrderToDeletePayments(null)}
          onError={(errorMessage: string) => {
            setOrderToDeletePayments(null);
            setMessage(errorMessage);
            setSubmitStatus("error");
          }}
          onCompleted={(deletedPaymentIds?: string[], deletedAmount?: number) => {
            if (!deletedPaymentIds || deletedPaymentIds.length === 0 || deletedAmount === undefined) {
              setOrderToDeletePayments(null);
              reload();
              return;
            }
            setLocalOrders(prev => prev.map(o => {
              if (o._id === orderToDeletePayments._id) {
                const newPaid = Math.max((o.paid || 0) - deletedAmount, 0);
                const newBalance = (o.balance || 0) + deletedAmount;

                let newStatus = o.computedStatus;
                if (newBalance > 0.01) {
                  if (o.client?.dueDays === 0) {
                    newStatus = "unpaid";
                  } else if (o.client?.dueDays > 0) {
                    const dueDateMillis = new Date(o.deliveredAt).getTime() + (o.client.dueDays * 86400000);
                    newStatus = DateTime.now().toMillis() > dueDateMillis ? "overdue" : "pending";
                  } else {
                    newStatus = "pending";
                  }
                }

                const newPayments = o.payments?.filter((p: { _id: string; }) => !deletedPaymentIds.includes(p._id)) || [];

                return {
                  ...o,
                  paid: newPaid,
                  balance: newBalance,
                  computedStatus: newStatus as any,
                  payments: newPayments
                };
              }
              return o;
            }));
            setOrderToDeletePayments(null);
            setMessage("Payment(s) successfully deleted.");
            setSubmitStatus("success");
          }}
        />
      )}
    </div>
  );
}