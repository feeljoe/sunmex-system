"use client";

import { useList } from "@/utils/useList";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { SearchBar } from "../ui/SearchBar";
import { RefreshButton } from "../ui/RefreshButton";
import LoadRequestDetailsModal from "../modals/LoadRequestDetailsModal";
import AssignLoadRequestRouteModal from "../modals/AssignLoadRequestModal";
import SubmitResultModal from "../modals/SubmitResultModal";
import { DateRangePicker } from "../ui/DateRangePicker";
import { DateTime } from "luxon";

export function LoadRequestsTable() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [loadRequestModal, setLoadRequestModal] = useState(false);
  const [loadRequest, setLoadRequest] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignRouteOpen, setAssignRouteOpen] = useState(false);
  const [statusView, setStatusView] = useState<"all" | "pending" | "assigned" | "prepared"> ("all");
  const [submitStatus, setSubmitStatus] = useState<"loading" | null> (null);

  const [fromDate, setFromDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));

  const { items, total, reload } = useList("/api/load-requests", {
    page,
    limit,
    search,
    startDate: fromDate,
    endDate: toDate,
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);},3000);
  }, [reload]);

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    approved: "bg-blue-500",
    assigned: "bg-purple-500",
    prepared: "bg-green-600",
    rejected: "bg-red-600",
    cancelled: "bg-red-600",
  };
  const filteredItems = items.filter((r: any) => {
    if (statusView === "all") return true;
    return r.status === statusView;
  });

  return (
    <>
    <div className="bg-(--secondary) rounded-lg shadow-xl p-6 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex justify-between mb-4 gap-5">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
          }}
        /> 
        <SearchBar
          placeholder="Search load requests..."
          onSearch={setSearch}
          debounce
        />
        <RefreshButton onRefresh={() => { reload(); setSubmitStatus("loading"); } } />
      </div>
      <div className="flex gap-2 mb-4 overflow-auto">
        {["all", "pending", "approved", "assigned", "prepared"].map((view) => (
            <button
            key={view}
            onClick={() => setStatusView(view as any)}
            className={`px-3 py-2 rounded-xl capitalize transition-all duration-300 ${
                statusView === view
                ? "bg-blue-500 text-white"
                : "bg-white"
            }`}
            >
            {view}
            </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm lg:text-lg">
          <thead>
            <tr className="border-b">
                <th className="p-2">
                    <input
                    type="checkbox"
                    checked={
                        filteredItems.length > 0 &&
                        filteredItems
                        .filter((r: any) => r.status === "approved")
                        .every((r: any) => selectedIds.includes(r._id))
                    }
                    onChange={(e) => {
                        if (e.target.checked) {
                        const selectable = filteredItems
                            .filter((r: any) => r.status === "approved")
                            .map((r: any) => r._id);

                        setSelectedIds(selectable);
                        } else {
                        setSelectedIds([]);
                        }
                    }}
                    className="h-5 w-5"
                    />
                </th>

                <th className="p-2">Assign</th>
                <th className="p-2">Request #</th>
                <th className="p-2">Requested By</th>
                <th className="p-2">Route Assigned</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created</th>
                <th className="p-2"></th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No load requests found
                </td>
              </tr>
            )}

            {filteredItems.map((r: any) => (
              <tr key={r._id} className="border-b whitespace-nowrap">
                <td className="p-2 text-center">
                {r.status === "approved" ? (
                    <input
                    type="checkbox"
                    checked={selectedIds.includes(r._id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, r._id]);
                        } else {
                        setSelectedIds((prev) =>
                            prev.filter((id) => id !== r._id)
                        );
                        }
                    }}
                    className="h-5 w-5"
                    />
                ) : (
                    "-"
                )}
                </td>

                <td className="p-2 text-center">
                {r.status === "approved" ? (
                    <button
                    onClick={() => {
                        setSelectedIds([r._id]);
                        setAssignRouteOpen(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-center hover:bg-blue-300 text-white rounded-xl transition-all duration-300"
                    >
                    Assign
                    </button>
                ) : (
                    "-"
                )}
                </td>
                <td className="p-2 font-medium">
                  {r.LRNumber || r._id.slice(-6)}
                </td>

                <td className="p-2">
                  {r.requestedBy?.firstName} {r.requestedBy?.lastName}
                </td>

                <td className="p-2 text-center">
                    {r.routeAssigned
                        ? `${r.routeAssigned?.code} | ${r.routeAssigned?.user?.firstName} ${r.routeAssigned?.user?.lastName}`
                        : "-"}
                </td>

                <td className="p-2">
                    <div
                        className={`px-2 py-2 rounded-xl text-center text-sm text-white font-bold ${
                        statusColors[r.status] || "bg-gray-500"
                        }`}
                    >
                        {r.status?.toUpperCase()}
                    </div>
                </td>

                <td className="p-2">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>

                <td className="p-2 text-right">
                  {r.status === "pending" && (
                    <button
                      onClick={() =>
                        router.push(`/pages/inventory/load-requests/${r._id}/review`)
                      }
                      className="px-4 py-2 w-30 text-center bg-blue-600 hover:bg-blue-300 text-white rounded-xl cursor-pointer transition-all duration:300"
                    >
                      Review
                    </button>
                  )}
                  {r.status !== "pending" && (
                    <button
                      onClick={() =>{
                        setLoadRequest(r);
                        setLoadRequestModal(true);
                      }
                      }
                      className="px-4 py-2 w-30 text-center bg-yellow-500 hover:bg-yellow-200 text-white rounded-xl cursor-pointer transition-all duration:300"
                    >
                      View
                    </button>
                  )}
                </td>
                {loadRequestModal && (
                    <LoadRequestDetailsModal
                        loadRequest={loadRequest}
                        onClose={() => {
                            setLoadRequestModal(false);
                            setLoadRequest(null);
                        }}
                    />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4">
            <div>
                {selectedIds.length > 0 && (
                <button
                    onClick={() => setAssignRouteOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-300 transition-all duration-300"
                >
                    Assign {selectedIds.length} Selected
                </button>
                )}
            </div>
            <div className="flex justify-end gap-4 mt-4">
            <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50"
            >
            Prev
            </button>

            <span>
            Page {page} of {totalPages}
            </span>

            <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50"
            >
            Next
            </button>
            </div>
        </div>
    </div>
    {assignRouteOpen && (
  <AssignLoadRequestRouteModal
    loadRequestIds={selectedIds}
    onClose={() => {
      setAssignRouteOpen(false);
      setSelectedIds([]);
    }}
    onAssigned={() => {
      reload();
      setSelectedIds([]);
    }}
  />
)}
    {submitStatus && (
      <SubmitResultModal
          status={submitStatus}
          message={""}
          onClose={() => {
              setSubmitStatus(null);
          }}
          collection="Load Request"
      />
    )}
    </>
  );
}