"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshButton } from "../../../../components/ui/RefreshButton";
import { DateRangePicker } from "../../../../components/ui/DateRangePicker";
import { useList } from "@/utils/useList";

type Order = {
  _id: string;
  number: string;
  client: { name: string, paymentTerm: string, discountPercentage: number };
  deliveredAt: string;
  total: number;
  credits: number;
  paid: number;
  balance: number;
  computedStatus: "paid" | "pending" | "overdue";
  payments: any[];
  type: "order" | "creditMemo";
};

export default function AccountingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");

  const [paymentInputs, setPaymentInputs] = useState<Record<string, any>>({});

  const [chain, setChain] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);

  const { items: chains } = useList("/api/chains", { limit: 1000 });
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch("/api/routes?limit=100");
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

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  const fetchOrders = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (chain && chain !== "all") params.append("chain", chain);
    if (vendor && vendor !== "all") params.append("vendor", vendor);
    if (status && status !== "all") params.append("status", status);

    const res = await fetch(`/api/accounting/orders?${params.toString()}`);
    const data = await res.json();

    const orders = (data.items || []).map((o: any) => ({
        ...o,
        type: "order",
    }));

    const creditMemos = (data.unlinkedCreditMemos || []).map((cm: any) => ({
        _id: cm._id,
        number: cm.number,
        client: { name: cm.client?.clientName || "No Client" },
        deliveredAt: cm.returnedAt, // 👈 use returnedAt
        total: 0,
        credits: cm.total || 0,
        paid: 0,
        balance: cm.total || 0,
        computedStatus: "pending", // always pending (credit to apply)
        payments: [],
        type: "creditMemo",
      }));

    setOrders([...orders, ...creditMemos]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [from, to, status, chain, vendor]);

  // -----------------------------
  // PAYMENT HANDLER
  // -----------------------------
  const handlePay = async (order: Order) => {
    const input = paymentInputs[order._id];
    if (!input || !input.amount) return;

    const newPayments = [
      ...(order.payments || []),
      {
        type: input.method,
        amount: Number(input.amount),
        checkNumber: input.method === "check" ? input.checkNumber : undefined,
      },
    ];

    const res = await fetch(`/api/preOrders/${order._id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments: newPayments }),
    });

    if (!res.ok) {
      alert("Error saving payment");
      return;
    }

    // refresh
    fetchOrders();

    // clear input
    setPaymentInputs(prev => ({
      ...prev,
      [order._id]: {},
    }));
  };

  // -----------------------------
  // STATUS BADGE
  // -----------------------------
  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-200 text-green-800";
    if (status === "overdue") return "bg-red-200 text-red-800";
    return "bg-yellow-200 text-yellow-800";
  };

  return (
    <div className="p-4 space-y-4 h-full">

      <h1 className="text-3xl font-bold text-center dark:text-white">Accounting - Orders</h1>
    
    <div className="flex flex-col p-4 h-4/5 bg-(--secondary) rounded-xl">
      {/* FILTERS */}
      <div className="flex gap-4 justify-between items-center p-4 rounded-xl">
      
        <div>
            <DateRangePicker
            fromDate={from}
            toDate={to}
            onChange={(from, to) => {
                setFrom(from);
                setTo(to);
            }}
            /> 
        </div>

        <div>
          <label className="text-sm">Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="flex flex-col bg-white rounded px-2 py-1"
          >
            <option value="all">All</option>
            {chains.map((c) => (
                <option key={c._id} value={c._id}>
                    {c.name}
                </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Vendor</label>
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="flex flex-col bg-white rounded px-2 py-1"
          >
            <option value="all">All</option>
            {vendors.map((v) => (
                <option key={v.user?._id} value={v.user?._id}>
                    {v.code} | {v.user?.firstName} {v.user?.lastName}
                </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex flex-col bg-white rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <RefreshButton onRefresh={fetchOrders}/>
      </div>

      {/* TABLE */}
      <div className="flex-1 bg-white rounded-xl h-4/5 shadow-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="whitespace-nowrap">
              <th className="p-2">Client</th>
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
            {loading && (
              <tr>
                <td colSpan={9} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && orders.map((o) => (
              <tr key={o._id} className="border-t whitespace-nowrap text-center">

                <td className="p-2 text-left">{o.client.name}</td>
                <td className="p-2">{o.number}</td>
                <td className="p-2">
                  {o.deliveredAt
                    ? new Date(o.deliveredAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-2">${o.total.toFixed(2)}</td>
                <td className="p-2">${o.credits.toFixed(2)}</td>
                <td className="p-2">${o.paid.toFixed(2)}</td>
                <td className="font-bold p-2">${o.balance.toFixed(2)}</td>

                {/* STATUS */}
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                      o.computedStatus
                    )}`}
                  >
                    {o.computedStatus.toUpperCase()}
                  </span>
                </td>

                {/* PAYMENT TERM */}
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold`}
                  >
                    {o.client?.paymentTerm?.toUpperCase() || "-"}
                  </span>
                </td>

                {/* PAYMENT INPUT */}
                <td className="w-100">
                  {o.type === "order" && o.computedStatus !== "paid" && (
                    <div className="flex p-2 w-full h-full items-center justify-between">

                        <div className="border h-10 rounded-xl ">
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
                        className="border rounded-xl px-2 w-20 h-10"
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
                        className="bg-green-500 text-white h-10 px-4 py-2 rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            ))}

          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}