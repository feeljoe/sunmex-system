"use client";

import { useList } from "@/utils/useList";
import { useMemo, useState } from "react";

export default function StepSelectClient({
  userRole,
  selectedClient,
  onSelect
}: {
  userRole: string,
  selectedClient: any,
  onSelect: (client: any) => void;
}) {
  const [search, setSearch] = useState("");

  /**
   * ADMIN → fetch clients directly
   */
  const {
    items: adminClients,
    loading: loadingAdmin,
  } = useList(userRole === "admin" ? "/api/clients" : "", {
    search: search || undefined,
  });

  /**
   * VENDOR → fetch routes
   */
  const {
    items: vendorClients,
    loading: loadingVendor,
  } = useList(userRole === "vendor" ? "/api/routes/my" : "");

  /**
   * Normalize into a single client list
   */
  const allClients = useMemo(() => {
    if (userRole === "admin") {
      return Array.isArray(adminClients) ? adminClients : [];
    }

    if (userRole === "vendor") {
      return vendorClients || [];
    }

    return [];
  }, [userRole, adminClients, vendorClients]);

  /**
   * Client-side filtering (safe, stable)
   */
  const filteredClients = useMemo(() => {
    if (!search.trim()) return allClients;

    const q = search.toLowerCase();
    return allClients.filter((c) =>
      c.clientName?.toLowerCase().includes(q)
    );
  }, [allClients, search]);

  const loading = loadingAdmin || loadingVendor;


  return (
    <div className="space-y-4 h-full w-full flex flex-col">
      <h2 className="text-xl font-semibold text-center">
        Select Client
      </h2>

      {/* 🔍 Search */}
      <input
        type="text"
        placeholder="Search client..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 rounded-xl bg-white shadow-xl"
      />

    {loading && (
      <p>Loading clients...</p>
    )}
      {/* 📋 Client list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredClients.length === 0 && (
          <p className="text-center text-gray-500">
            No available clients for today
          </p>
        )}

        {filteredClients.map((client) => {
          const isSelected = selectedClient?._id === client._id;

          return (
            <button
              key={client._id}
              type="button"
              onClick={() => onSelect(client)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration:500 capitalize
                ${
                  isSelected
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white hover:bg-gray-100"
                }`}
            >
              {client.clientName.toLowerCase()} <span className={`text-gray-400 text-sm ${
                  isSelected
                    ? "text-white"
                    : ""
                }`}>({client.billingAddress?.addressLine}, {client.billingAddress?.city}, {client.billingAddress?.state}, {client.billingAddress?.country}, {client.billingAddress?.zipCode})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
