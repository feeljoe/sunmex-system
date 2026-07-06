"use client";

import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import PrepareLoadRequestModal from "@/components/load-requests/LoadRequestPrepareModal";
import SubmitResultModal from "../modals/SubmitResultModal";

export function WarehouseLoadRequestsTable({ user }: any) {
  const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<"all" | "pending" | "completed">("pending");
    const [viewMode, setViewMode] = useState<"pending" | "completed">("pending");

  const [selectedRoute, setSelectedRoute] =
    useState<string>("");

  const [selectedLoadRequest, setSelectedLoadRequest] =
    useState<any | null>(null);

  const { items: routes } = useList("/api/routes", {
    type: "driver",
  });

  // Map UI → backend status
  const statusParam =
    selectedStatus === "pending"
      ? "assigned"
      : selectedStatus === "completed"
      ? "prepared"
      : "";

  const { items: loadRequests, reload } = useList(
    "/api/load-requests",
    {
      status: statusParam,
      route: selectedRoute,
    }
  );

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const statusColors: Record<string, string> = {
    assigned: "bg-purple-400 text-purple-800",
    prepared: "bg-green-400 text-green-800",
  };

  const handleViewMode = (value: "pending" | "completed") => {
    if(viewMode === value) return;
    setViewMode(value);
};

  return (
    <>
      <div className="bg-(--secondary) font-mono font-bold rounded-xl shadow-xl p-4 flex flex-col h-[80vh] w-[90vw]">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">

            {/* ROUTE FILTER */}
            <div className="flex gap-2 items-center h-10">
              <label className="font-semibold">
                Route:
              </label>

              <select
                value={selectedRoute}
                onChange={(e) =>
                  setSelectedRoute(e.target.value)
                }
                className="rounded-xl font-mono bg-white shadow-xl p-2 h-10"
              >
                <option value="">All routes</option>
                {routes.map((r: any) => (
                  <option key={r._id} value={r._id} className="font-mono">
                    {r.code} | {r.user.firstName}{" "}
                    {r.user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS FILTER */}
            <div className="flex gap-2 p-1 bg-gray-200 rounded-xl">
                                <button
                                    onClick={() => { 
                                            setSubmitStatus("loading");
                                            setSelectedStatus("pending");
                                            handleViewMode("pending");
                                            setTimeout(() => setSubmitStatus(null), 1000);
                                    }}
                                    className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "pending" ? "bg-white shadow-md text-blue-800": "text-gray-500 hover:bg-gray-400"}`}>
                                        Pending
                                </button>
                                <button
                                    onClick={() => { 
                                        setSubmitStatus("loading");
                                        setSelectedStatus("completed");
                                        handleViewMode("completed");
                                        setTimeout(() => setSubmitStatus(null), 1000);
                                    }}
                                    className={`px-4 py-1 font-bold rounded-lg transition-all ${viewMode === "completed" ? "bg-white shadow-md text-green-800": "text-gray-500 hover:bg-gray-400"}`}>
                                        Completed
                                </button>
                        </div>

          <RefreshButton onRefresh={() => {
            setSubmitStatus("loading");
            reload();
            setTimeout(() => setSubmitStatus(null), 3000);
            }} />
        </div>

        {/* TABLE */}
        <div className="overflow-auto h-full w-full bg-white shadow-xl rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-(--tertiary) sticky top-0">
              <tr className="border-b">
                <th className="p-2">Vendor</th>
                <th className="p-2">Route</th>
                <th className="p-2 text-right">Items</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Date</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loadRequests.map((lr: any) => (
                <tr
                  key={lr._id}
                  className={`border-b hover:bg-gray-100 ${
                    lr.status === "prepared"
                      ? "bg-green-100"
                      : ""
                  }`}
                >
                  <td className="p-2 capitalize">
                  {lr.route?.code} | {lr.route?.user?.firstName} {lr.route?.user?.lastName}
                  </td>

                  <td className="p-2">
                    {lr.routeAssigned?.code} | {lr.routeAssigned?.user?.firstName} {lr.routeAssigned?.user?.lastName}
                  </td>

                  <td className="p-2 text-right">
                    {lr.products.reduce(
                      (sum: number, p: any) =>
                        sum + p.approvedQuantity,
                      0
                    )}
                  </td>

                  <td className="p-2 text-center">
                    <div
                        className={`p-1 rounded-xl text-center font-bold ${
                        statusColors[lr.status] || "bg-gray-400"
                        }`}
                    >
                        {lr.status?.toUpperCase()}
                    </div>
                </td>

                  <td className="p-2 text-center">
                    {formatDate(lr.createdAt)}
                  </td>

                  <td className="p-2">
                    <button
                      onClick={() =>
                        setSelectedLoadRequest(lr)
                      }
                      className={`p-2 rounded-xl transition-all duration:300 ${
                        lr.status === "assigned"
                          ? "bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800"
                          : "bg-yellow-400 text-yellow-800 hover:text-white hover:bg-yellow-800"
                      }`}
                    >
                      {lr.status === "assigned"
                        ? "Prepare"
                        : "Review"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {selectedLoadRequest && (
        <PrepareLoadRequestModal
          user={user}
          loadRequest={selectedLoadRequest}
          onClose={() =>
            setSelectedLoadRequest(null)
          }
          readOnly={
            selectedLoadRequest.status ===
            "prepared"
          }
          onCompleted={() => {
            setSelectedLoadRequest(null);
            reload();
          }}
        />
      )}
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={""}
          onClose={() => setSubmitStatus(null)}
          collection="Warehouse Load Requests"
        />
      )}
    </>
  );
}