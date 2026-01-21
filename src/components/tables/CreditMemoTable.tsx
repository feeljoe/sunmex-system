"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { DateRangePicker } from "../ui/DateRangePicker";
import CancelCreditMemoModal from "../modals/CancelCreditMemoModal";
import CreditMemoDetailsModal from "../modals/CreditMemoDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";

export function CreditMemosTable({ userRole, userId }: { userRole: string; userId: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-300",
    received: "bg-green-500 text-white",
    cancelled: "bg-red-500 text-white",
  };

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");

  const todayISO = () => new Date().toISOString().split("T")[0];
  const today = todayISO();

  const [fromDate, setFromDate] = useState(userRole === "vendor" ? today : "");
  const [toDate, setToDate] = useState(userRole === "vendor" ? today : "");
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate,
    toDate,
  });

  const { items, total, reload } = useList("/api/credit-memos", {
    page,
    limit,
    search,
    fromDate: appliedFilters.fromDate,
    toDate: appliedFilters.toDate,
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] =
    useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const formatCurrency = (v?: number) => (v != null ? `$${v.toFixed(2)}` : "-");
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
      const res = await fetch(`/api/credit-memos/${cancelTarget._id}`, {
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
      const idx = items.findIndex((i: any) => i._id === updated._id);
      if (idx !== -1) items[idx] = updated;

      setSubmitStatus("success");
      setCancelTarget(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
      {userRole === "admin" && (
        <div className="flex items-center mb-4">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
              setAppliedFilters({ fromDate: from, toDate: to });
            }}
          />
        </div>
      )}

      <div className="flex justify-between mb-4">
        <SearchBar placeholder="Search credit memos..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={reload} />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="text-left lg:text-lg">
          <thead>
            <tr className="border-b">
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
                  <th className="p-2">Returned By</th>
                  <th className="p-2">Returned Date</th>
                  <th className="p-2">Returned At</th>
                </>
              )}
              <th className="p-2">Cancel</th>
              {userRole === "admin" && (
                <>
                  <th className="p-2">Cancelled Date</th>
                  <th className="p-2">Cancelled By</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((it: any) => (
              <tr
                key={it._id}
                className="border-b hover:bg-gray-50 cursor-pointer text-sm"
                onClick={() => setSelected(it)}
              >
                <td className="p-2 whitespace-nowrap">{it.number}</td>
                <td className="p-2 whitespace-nowrap capitalize">{it.client?.clientName.toLowerCase()}</td>
                <td className="p-2 whitespace-nowrap">{formatCurrency(it.subtotal)}</td>
                <td className="p-2 whitespace-nowrap">{formatCurrency(it.total)}</td>
                <td className="p-2 whitespace-nowrap">
                  <div className={`px-2 py-2 rounded-xl text-center whitespace-nowrap ${statusColors[it.status]}`}>
                    {it.status.toUpperCase()}
                  </div>
                </td>

                {userRole === "admin" && (
                  <>
                    <td className="p-2 whitespace-nowrap capitalize">
                      {it.createdBy?.firstName.toLowerCase()} {it.createdBy?.lastName.toLowerCase()}
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatDate(it.createdAt)}</td>
                    <td className="p-2 whitespace-nowrap">{formatTime(it.createdAt)}</td>
                    <td className="p-2 whitespace-nowrap capitalize">{it.routeAssigned?.code} | {it.routeAssigned?.user?.firstName.toLowerCase() } {it.routeAssigned?.user?.lastName.toLowerCase()} </td>
                    <td className="p-2 whitespace-nowrap">{formatDate(it.returnedAt)}</td>
                    <td className="p-2 whitespace-nowrap">{formatTime(it.returnedAt)}</td>
                  </>
                )}

                {it.status === "pending" ? (
                  <td className="p-2 whitespace-nowrap">
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget(it);
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                ) : (
                  <td className="p-2 text-center whitespace-nowrap">-</td>
                )}

                {userRole === "admin" && (
                  <>
                    <td className="p-2 text-red-500 whitespace-nowrap">{formatDate(it.cancelledAt)}</td>
                    <td className="p-2 text-red-500 whitespace-nowrap capitalize">
                      {it.cancelledBy?.firstName.toLowerCase()} {it.cancelledBy?.lastName.toLowerCase()}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>◀</button>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>▶</button>
      </div>

      {selected && (
        <CreditMemoDetailsModal
          creditMemo={selected}
          onClose={() => setSelected(null)}
        />
      )}

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
    </div>
  );
}
