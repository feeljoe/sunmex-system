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

type Order = {
  _id: string;
  number: string;
  client: { name: string, paymentTerm: string, discountPercentage: number };
  deliveredAt: string;
  total: number;
  credits: number;
  paid: number;
  balance: number;
  computedStatus: "paid" | "pending" | "overdue" | "unpaid";
  payments: any[];
  type: "order" | "directSale" | "creditMemo";
  cogs?: number;
};

export default function AccountingOrdersPage() {
  // Default to current week
  const [from, setFrom] = useState(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [to, setTo] = useState(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));
  const [status, setStatus] = useState("all");
  const [chain, setChain] = useState("");
  const [vendor, setVendor] = useState("");
  const [search, setSearch] = useState("");

  const [paymentInputs, setPaymentInputs] = useState<Record<string, any>>({});
  const [selectedCredits, setSelectedCredits] = useState<Record<string, number>>({});
  const [vendors, setVendors] = useState<any[]>([]);

  // Bulk Selection States
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
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null> (null);
  const [message, setMessage] = useState("");

  const [orderToDeletePayments, setOrderToDeletePayments] = useState<Order | null>(null);

  const { items: chains } = useList("/api/chains", { limit: 1000 });
  
  const { items: fetchedOrders, meta, loading, reload } = useList("/api/accounting/orders", {
    from,
    to,
    chain: chain !== "all" ? chain : undefined,
    vendor: vendor !== "all" ? vendor : undefined,
    status: status !== "all" ? status : undefined,
    search,
    limit: 1000,
  });

  const orders = useMemo<Order[]>(() => {
    const mappedOrdersAndSales = (fetchedOrders || []).map((item: any) => ({
      ...item,
      type: item.source === "directSale" ? "directSale" : "order", 
    }));
    const creditMemos = (meta.unlinkedCreditMemos || []).map((cm: any) => ({
      _id: cm._id,
      number: cm.number,
      client: { name: cm.client?.clientName || "No Client" },
      deliveredAt: cm.returnedAt,
      total: 0,
      credits: -cm.total || 0,
      paid: 0,
      balance: cm.paymentProcessed ? 0 : (-cm.total || 0),
      computedStatus: cm.paymentProcessed ? "paid" : "pending",
      payments: [],
      type: "creditMemo",
    }));

    return [...mappedOrdersAndSales, ...creditMemos].sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );
  }, [fetchedOrders, meta.unlinkedCreditMemos]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch("/api/routes?limit=1000");
        const data = await res.json();
        if(res.ok){
          setVendors(data.items.filter((u: any) => u.type === "vendor"));
        }
      } catch(err) {
        console.error("Failed to fetch routes:", err);
      }
    };
    fetchRoutes();
  }, []);

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);},3000);
  }, [reload]);

  const handlePay = async (order: Order) => {
    const input = paymentInputs[order._id];
    if (!input || !input.amount) return;

    const selectedCreditTotal = Object.values(selectedCredits).reduce((a,b) => a + b, 0);

    const newPayments = [
      ...(order.payments || []),
      {
        type: input.method,
        amount: Number(input.amount) - selectedCreditTotal,
        checkNumber: input.method === "check" ? input.checkNumber : undefined,
      },
    ];

    // Determine the correct API endpoint based on the order type!
    const endpoint = order.type === "directSale" 
        ? `/api/direct-sales/${order._id}/pay`
        : `/api/preOrders/${order._id}/pay`;

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        payments: newPayments,
        discountPercent: input.discount || 0 
      }),
    });

    if (res.ok) {
        reload();
        setPaymentInputs(prev => ({ ...prev, [order._id]: {} }));
        setSelectedCredits({});
    } else {
        alert("Error saving payment");
    }
  };

  const handleBulkPay = async () => {
    if (!bulkAmount || isNaN(Number(bulkAmount))) return alert("Enter a valid amount");

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
        setIsBulkModalOpen(false);
        setSelectedItems(new Set());
        setBulkAmount("");
        setBulkCheckNumber("");
        reload();
    } else {
        alert("Error processing bulk payment");
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-200 text-green-800";
    if (status === "overdue") return "bg-red-200 text-red-800";
    if (status === "unpaid") return "bg-orange-200 text-orange-800";
    return "bg-yellow-200 text-yellow-800";
  };

  const totals = useMemo(() => {
    let totalOwed = 0;
    let totalCogs = 0;
    orders.forEach(o => {
        totalOwed += o.balance;
        totalCogs += o.cogs || 0;
    });
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
        if (res.ok) {
          setSelectedPreorder(data);
        }
      } else if (o.type === "creditMemo") {
        const res = await fetch(`/api/credit-memos/${o._id}`);
        const data = await res.json();
        if (res.ok) {
          setSelectedCreditMemo(data);
        }
      } else if (o.type === "directSale"){
        const res = await fetch(`/api/direct-sales/${o._id}`);
        const data = await res.json();
        if (res.ok) {
          setSelectedDirectSale(data);
        }
      }
    } catch (err) {
      console.error("Failed to load item: ", err);
    } finally {
      setLoadingRow(null);
    }
  };

  return (
    <div className="p-4 space-y-4 h-full">
      <h1 className="text-3xl font-bold text-center dark:text-white">Accounting - Orders</h1>
    
      <div className="flex flex-col p-4 h-[75vh] w-[90vw] bg-(--secondary) rounded-xl">
        <div className="flex flex-col w-full py-4 gap-4 justify-between items-center rounded-xl">
        <p className="border-b w-full border-(--quarteary) text-center text-xl font-bold">Filters</p>
        <div className="flex w-full justify-between">
            <select value={chain} onChange={(e) => setChain(e.target.value)} className="bg-white rounded p-2 h-10">
              <option value="all">All Chains</option>
              {chains.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
            </select>

            <select value={vendor} onChange={(e) => setVendor(e.target.value)} className="bg-white rounded p-2 h-10">
              <option value="all">All Vendors</option>
              {vendors.map((v) => (<option key={v.user?._id} value={v.user?._id}>{v.code} | {v.user?.firstName} {v.user?.lastName}</option>))}
            </select>
          
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white rounded p-2 h-10">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>

              <button 
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={selectedItems.size === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl disabled:bg-gray-400 hover:bg-blue-500 transition-colors"
              >
                  Bulk Pay ({selectedItems.size})
              </button>
          </div>
          <div className="flex w-full gap-4">
              <DateRangePicker fromDate={from} toDate={to} onChange={(f, t) => { setFrom(f); setTo(t); }} /> 
              <SearchBar placeholder="Search document..." onSearch={setSearch} debounce />
              <RefreshButton onRefresh={() => {reload(); setSubmitStatus("loading");}}/>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl h-4/5 shadow-xl overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="whitespace-nowrap text-center">
                <th className="p-2 w-10">
                    <input 
                        type="checkbox" 
                        onChange={(e) => {
                            if (e.target.checked) setSelectedItems(new Set(orders.map(o => o._id)));
                            else setSelectedItems(new Set());
                        }}
                        checked={selectedItems.size === orders.length && orders.length > 0}
                        className="w-8 h-8"
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

            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center p-4">Loading...</td></tr>
              ) : (
                orders.map((o) => (
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
                          className="w-8 h-8"
                      />
                  </td>
                  <td className="p-2 text-left">{o.client.name}</td>
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
                                    className="ml-4 px-2 py-1 bg-red-300 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors cursor-pointer font-bold text-sm"
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
                        <div className="flex gap-4 w-full h-full items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="border h-10 w-28 rounded-xl">
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
                            className="w-full h-full"
                            >
                            <option value={0}>No Discount</option>
                            <option value={1}>1%</option>
                            <option value={2}>2%</option>
                            </select>
                        </div>

                        <div className="border h-10 w-24 rounded-xl">
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
                            className="w-full h-full"
                            >
                            <option value="">Type</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
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
                            className="border rounded-xl px-2 w-28 h-10"
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
                            className="border rounded-xl h-10 px-2 w-24"
                            />
                        )}

                        <button
                            onClick={() => handlePay(o)}
                            className="bg-green-500 text-white h-10 px-4 py-2 w-24 rounded-xl cursor-pointer hover:bg-green-300 transition-all duration:300"
                        >
                            Add
                        </button>
                        </div>
                    )}
                    </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        <div className="p-4 font-bold flex justify-end gap-10">
          <div>Total Owed: {formatCurrency(totals.totalOwed)}</div>
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
                                <button onClick={() => toggleSelect(record._id)} className="text-white bg-red-500 px-2 py-2 text-sm rounded-xl hover:underline hover:bg-red-300 cursor-pointer transition-all duration:300">
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
              reload();
            }}
          />
      )}
    </div>
  );
}