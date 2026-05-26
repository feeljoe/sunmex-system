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
    }
  );

  const filtered = loadRequests.filter((lr: any) => {
    if (
      selectedRoute &&
      lr.route?._id !== selectedRoute
    )
      return false;

    return true;
  });

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const statusColors: Record<string, string> = {
    assigned: "bg-purple-500",
    prepared: "bg-green-600",
  };

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);}, 3000);
  }, [reload]);

  return (
    <>
      <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-4 flex flex-col h-[75vh] w-[90vw]">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex gap-6 items-center">

            {/* ROUTE FILTER */}
            <div className="flex gap-2 items-center">
              <label className="font-semibold">
                Route:
              </label>

              <select
                value={selectedRoute}
                onChange={(e) =>
                  setSelectedRoute(e.target.value)
                }
                className="rounded-xl bg-white shadow-xl px-3 py-2"
              >
                <option value="">All routes</option>
                {routes.map((r: any) => (
                  <option key={r._id} value={r._id}>
                    {r.code} {r.user.firstName}{" "}
                    {r.user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS FILTER */}
            <div className="flex gap-2 items-center">
              <label className="font-semibold">
                View:
              </label>

              {["pending", "completed"].map((view) => (
                <button
                  key={view}
                  onClick={() =>
                    setSelectedStatus(view as any)
                  }
                  className={`px-3 py-1 rounded-xl capitalize ${
                    selectedStatus === view
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

          </div>

          <RefreshButton onRefresh={() => {reload(); setSubmitStatus("loading");}} />
        </div>

        {/* TABLE */}
        <div className="overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Vendor</th>
                <th className="p-2">Route</th>
                <th className="p-2">Items</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
                <th className="p-2"></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((lr: any) => (
                <tr
                  key={lr._id}
                  className={`border-b hover:bg-gray-50 ${
                    lr.status === "prepared"
                      ? "bg-green-50"
                      : ""
                  }`}
                >
                  <td className="p-2 capitalize">
                  {lr.route?.code} | {lr.route?.user?.firstName} {lr.route?.user?.lastName}
                  </td>

                  <td className="p-2">
                    {lr.routeAssigned?.code} | {lr.routeAssigned?.user?.firstName} {lr.routeAssigned?.user?.lastName}
                  </td>

                  <td className="p-2">
                    {lr.products.reduce(
                      (sum: number, p: any) =>
                        sum + p.approvedQuantity,
                      0
                    )}
                  </td>

                  <td className="p-2">
                    <div
                        className={`px-2 py-2 rounded-xl text-center text-sm text-white font-bold ${
                        statusColors[lr.status] || "bg-gray-500"
                        }`}
                    >
                        {lr.status?.toUpperCase()}
                    </div>
                </td>

                  <td className="p-2">
                    {formatDate(lr.createdAt)}
                  </td>

                  <td className="p-2">
                    <button
                      onClick={() =>
                        setSelectedLoadRequest(lr)
                      }
                      className={`px-5 py-3 rounded-xl transition-all duration-300 ${
                        lr.status === "assigned"
                          ? "bg-blue-500 text-white hover:bg-blue-300"
                          : "bg-yellow-500 text-white hover:bg-yellow-300"
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