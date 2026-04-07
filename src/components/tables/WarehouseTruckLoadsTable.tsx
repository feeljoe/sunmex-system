"use client";

import { useList } from "@/utils/useList";
import { useState } from "react";
import PrepareTruckLoadModal from "../modals/PrepareTruckLoadModal";

export function WarehouseTruckLoadsTable() {
  const { items: loads, reload } = useList("/api/truck-loads/warehouse");
  const { items: routes } = useList("/api/routes?type=onRoute");

  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null);

  const filtered = selectedRoute
    ? loads.filter((l: any) => l.route?._id === selectedRoute)
    : loads;

  return (
    <>
      <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-4 flex flex-col h-4/5">
        <div className="flex gap-4 items-center">
          <label className="font-semibold">Route:</label>
          <select
            value={selectedRoute}
            onChange={e => setSelectedRoute(e.target.value)}
            className="rounded-xl bg-white shadow-xl px-3 py-2"
          >
            <option value="">All routes</option>
            {routes.map((r: any) => (
              <option key={r._id} value={r._id}>
                {r.code}
              </option>
            ))}
          </select>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Route</th>
              <th className="p-2">Items</th>
              <th className="p-2">Status</th>
              <th className="p-2">Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l._id} className="border-b hover:bg-gray-50">
                <td className="p-2 whitespace-nowrap">{l.route?.code}</td>
                <td className="p-2 whitespace-nowrap">
                  {l.products.reduce((s: number, p: any) => s + p.quantity, 0)}
                </td>
                <td className="p-2 capitalize whitespace-nowrap">{l.status}</td>
                <td className="p-2 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleDateString()}
                </td>
                <td className="p-2 whitespace-nowrap">
                  <button
                    className="bg-blue-500 text-white px-5 py-3 rounded-xl"
                    onClick={() => setSelectedLoad(l)}
                  >
                    Prepare
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLoad && (
        <PrepareTruckLoadModal
          load={selectedLoad}
          onClose={() => setSelectedLoad(null)}
          onCompleted={() => {
            setSelectedLoad(null);
            reload();
          }}
        />
      )}
    </>
  );
}
