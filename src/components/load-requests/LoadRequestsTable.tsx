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
import CancelOrderModal from "../modals/CancelPreorderModal";

export function LoadRequestsTable() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [loadRequestModal, setLoadRequestModal] = useState(false);
  const [loadRequest, setLoadRequest] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignRouteOpen, setAssignRouteOpen] = useState(false);
  const [statusView, setStatusView] = useState<"all" | "pending" | "assigned" | "prepared">("all");
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
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

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-400 text-yellow-800",
    approved: "bg-blue-400 text-blue-800",
    assigned: "bg-purple-400 text-purple-800",
    prepared: "bg-orange-400 text-orange-800",
    rejected: "bg-red-400 text-red-800",
    cancelled: "bg-red-400 text-red-800",
    delivered: "bg-green-400 text-green-800",
  };
  const filteredItems = items.filter((r: any) => {
    if (statusView === "all") return true;
    return r.status === statusView;
  });

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  function formatLocation(location?: string) {
    switch (location) {
      case "yuma":
        return "Yuma";
      case "tucson":
        return "Tucson";
      case "elPaso":
        return "El Paso";
      case "lasVegas":
        return "Las Vegas";
      default:
        return "-";
    }
  }

  const cancelLoadRequest = async (reason: string) => {
    if (!loadRequest) return;
    setSubmitStatus("loading");
    setMessage("Cancelling Load Request...");
    try {
      const res = await fetch(`/api/load-requests/${loadRequest._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason : reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Failed to cancel Load Request");
        setSubmitStatus("error");
        return;
      }
      setSubmitStatus("success");
      setMessage("Load Request Cancelled Successfully");
      setLoadRequest(null);
    } catch (err: any) {
      setMessage(err.message);
      setSubmitStatus("error");
    } finally {
      setCancelModalOpen(false);
    }
  };

  return (
    <>
      <div className="bg-(--secondary) rounded-xl font-mono font-bold shadow-xl p-6 flex flex-col h-[80vh] w-[90vw]">

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
          <RefreshButton onRefresh={() => {
            setSubmitStatus("loading");
            reload();
            setTimeout(() => setSubmitStatus(null), 3000);
          }}
          />
          <button
            onClick={() => router.push("/pages/inventory/load-requests/create")}
            className="p-2 bg-blue-400 text-blue-800 hover:bg-blue-800 hover:text-white rounded-xl transition-all duration-300 whitespace-nowrap cursor-pointer"
            >
              + Create Load Request
            </button>
        </div>
        <div className="flex gap-2 mb-4 overflow-auto">
          {["all", "pending", "approved", "assigned", "prepared", "delivered", "cancelled", "rejected"].map((view) => (
            <button
              key={view}
              onClick={() => setStatusView(view as any)}
              className={`p-2 rounded-xl capitalize transition-all duration:300 ${statusView === view
                  ? "bg-blue-400 text-blue-800"
                  : "bg-white"
                }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-auto rounded-xl shadow-xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--tertiary) sticky top-0">
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

                <th className="p-2 text-center">Assign</th>
                <th className="p-2">Request #</th>
                <th className="p-2">Requested By</th>
                <th className="p-2">Route Assigned</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Type</th>
                <th className="p-2">Destination</th>
                <th className="p-2 text-center">Created At</th>
                <th className="p-2 text-center">Action</th>
                <th className="p-2 text-center">Cancel</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-4 text-2xl text-center text-gray-600">
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

                  <td className="p-2">
                    {r.routeAssigned
                      ? `${r.routeAssigned?.code} | ${r.routeAssigned?.user?.firstName} ${r.routeAssigned?.user?.lastName}`
                      : "-"}
                  </td>

                  <td className="p-2 text-center">
                    <div
                      className={`p-1 rounded-xl text-center ${statusColors[r.status]
                        }`}
                    >
                      {r.status?.toUpperCase()}
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    {r.requestType === "foreign" ?
                      (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-xl">
                          TRANSFER
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-xl">
                          ROUTE
                        </span>
                      )}
                  </td>
                  <td className="p-2">
                    {r.requestType === "foreign" ?
                      formatLocation(
                        r.destinationLocation
                      ) : r.route?.code
                        ? `Route: ${r.route.code}`
                      : "-"
                    }
                  </td>

                  <td className="p-2 text-center">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-2 text-center">
                    {r.status === "pending" && (
                      <button
                        onClick={() =>
                          router.push(`/pages/inventory/load-requests/${r._id}/review`)
                        }
                        className="p-1 w-20 text-center bg-blue-400 hover:bg-blue-800 text-blue-800 hover:text-white rounded-xl cursor-pointer transition-all duration:300"
                      >
                        Review
                      </button>
                    )}
                    {r.status !== "pending" && (
                      <button
                        onClick={() => {
                          setLoadRequest(r);
                          setLoadRequestModal(true);
                        }
                        }
                        className="p-1 w-20 text-center bg-yellow-400 hover:bg-yellow-800 text-yellow-800 hover:text-white rounded-xl cursor-pointer transition-all duration:300"
                      >
                        View
                      </button>
                    )}
                  </td>
                  {r.status !== "cancelled" && r.status !== "delivered" ? (
                      <td className="p-2 text-center">
                        <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:500' onClick={(e) => { e.stopPropagation(); setLoadRequest(r); setCancelModalOpen(true); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                      </td>
                    ) : <td className="p-2 text-center">-</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loadRequestModal && (
          <LoadRequestDetailsModal
            loadRequest={loadRequest}
            onClose={() => {
              setLoadRequestModal(false);
              setLoadRequest(null);
            }}
          />
        )}
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
          <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
        <span>
          Showing {items.length} of {total} Supplier Receipts
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
      {cancelModalOpen && loadRequest && (
        <CancelOrderModal loadRequest={loadRequest} onClose={() => setCancelModalOpen(false)} onConfirm={cancelLoadRequest} />
      )}
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
            reload();
          }}
          collection="Load Request"
        />
      )}
    </>
  );
}