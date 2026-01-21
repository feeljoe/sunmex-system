"use client";
import { useState } from 'react';
import { useList } from '@/utils/useList';
import PreorderPrepareModal from "../modals/PreorderPrepareModal";
import PreorderPaymentModal from '../modals/PreorderPaymentModal';
import PrepareCreditMemoModal from '../modals/PrepareCreditMemoModal';
import { RefreshButton } from '../ui/RefreshButton';
import { DateRangePicker } from '../ui/DateRangePicker';

type ViewMode = "ready" | "delivered";

export default function DriverPreordersTable({userRole} : {userRole: string | undefined}) {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const { items: preorders, reload } = useList('/api/preOrders/driver', {
    fromDate,
    toDate,
  });
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedCreditMemo, setSelectedCreditMemo] = useState<any | null>(null);
  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [paymentPreorder, setPaymentPreorder] = useState<any | null>(null);
  const [view, setView] = useState<ViewMode>("ready");
  
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

  const formatDate = (v?: string) =>
    v? new Date(v).toLocaleDateString() : "-";

  const formatTime = (v?: string) =>
    v
      ? new Date(v).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "-";
  
  const filteredPreorders = preorders.filter((p: any) => {
    if(view === "ready") return p.status === "ready";
    if(view === "delivered") return p.status === "delivered";
    return false;
  });

  return (
    <div className="bg-(--secondary) rounded-xl shadow p-6 lg:p-10 flex flex-col h-4/5">
      <h1 className="text-2xl font-semibold mb-4">
        {view === "ready"? "Ready for Delivery" : "Delivered"}
      </h1>
      <div className='flex items-center justify-between mb-4'>
        {userRole === "admin" &&
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
          }}
        /> 
        }
        <RefreshButton onRefresh={reload}/>
      </div>
      <div className='flex gap-2 mb-6'>
        <button
          onClick={() => setView("ready")}
          className={`px-5 py-3 rounded-xl transition-all duration:300
          ${view ==="ready"
          ? "bg-blue-600 text-white"
          : "bg-gray-200"
          }`}>
            Pending
        </button>
        <button
          onClick={() => setView("delivered")}
          className={`px-5 py-3 rounded-xl transition-all duration:300
          ${view ==="delivered"
          ? "bg-blue-600 text-white"
          : "bg-gray-200"
          }`}>
            Delivered
        </button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Client</th>
            <th className="p-2">Route</th>
            <th className="p-2">Subtotal</th>
            <th className="p-2">Total</th>
            <th className="p-2 text-right">Payment Status</th>
            <th className="p-2 text-right">
              {view==="ready" ? "Ready Date" : "Delivered Date"}
            </th>
            <th className='p-2 text-right'>{view==="ready" ? "Ready At": "Delivered At"}</th>
          </tr>
        </thead>
        <tbody>
          {filteredPreorders.length === 0 && (
            <tr>
              <td colSpan={5} className='p-6 text-center text-gray-500'>
                No orders found
              </td>
            </tr>
          )}
          {filteredPreorders.map((it: any) => (
            <tr
              key={it._id}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                if(it.creditMemo?.status ==="pending") {
                  setSelectedCreditMemo(it.creditMemo);
                  setSelectedPreorder(it);
              }else if(it.status === "ready"){
                setSelected(it);
              } else {
                setPaymentPreorder(it);
              }
            }}
            >
              <td className="p-2 whitespace-nowrap capitalize">{it.client?.clientName.toLowerCase()}</td>
              <td className="p-2 whitespace-nowrap">{it.routeAssigned?.code}</td>
              
              <td className="p-2 whitespace-nowrap">{formatCurrency(it.subtotal)}</td>
              <td className="p-2 whitespace-nowrap">{formatCurrency(it.total)}</td>
              <td className={`p-2 text-right whitespace-nowrap`}>
                <span 
                  className={`p-2 font-bold rounded-xl ${
                    it.paymentStatus === "pending"
                    ? "bg-gray-300" 
                    : "bg-green-600 text-white"
                    }`}
                >
                  {it.paymentStatus.toUpperCase()}
                </span>
              </td>
              <td className="p-2 text-right whitespace-nowrap">
                {formatDate(
                  view === "ready"
                  ? it.updatedAt || it.createdAt
                  : it.deliveredAt
                  )}
              </td>
              <td className="p-2 text-right whitespace-nowrap">
                {formatTime(
                  view === "ready"
                  ? it.updatedAt || it.createdAt
                  : it.deliveredAt
                  )}
              </td>
              {it.creditMemo && (
                <td className="p-2 text-orange-600 font-semibold">
                  Return Pending
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* STEP 1: CREDIT MEMO */}
      {selectedCreditMemo && (
        <PrepareCreditMemoModal
          creditMemo ={selectedCreditMemo}
          onClose={() => setSelectedCreditMemo(null)}
          onCompleted={() => {
            setSelectedCreditMemo(null);
            setSelected(selectedPreorder);
          }}
        />
      )}
      {/* STEP 2: PREORDER PREPARATION DETAILS */}
      {selected && (
        <PreorderPrepareModal
          preorder={selected}
          onClose={() => setSelected(null)}
          onDelivered={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
      {paymentPreorder && (
        <PreorderPaymentModal
          preorder={paymentPreorder}
          onClose={() => setPaymentPreorder(null)}
          onPaid={() => {
            setPaymentPreorder(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
