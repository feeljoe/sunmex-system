"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useFilteredList } from "../ui/hooks/useFilteredList";
import { useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";

interface DirectSalesTableProps {
  route?: any; // passed for drivers
  isAdmin?: boolean;
}

export function DirectSalesTable({ route, isAdmin }: DirectSalesTableProps) {
  // Admin → see all direct sales
  // Driver → see own route sales
  const endpoint = isAdmin
    ? "/api/direct-sales"
    : `/api/direct-sales?routeId=${route?._id}`;

  const { items,reload } = useList(endpoint);

  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const filteredItems = useFilteredList(
    items,
    search,
    (sale: any, q) =>
      sale.client?.clientName?.toLowerCase().includes(q) ||
      sale.createdBy?.firstName?.toLowerCase().includes(q)
  );

  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toFixed(2)}` : "-";

  const formatDate = (v?: string) =>
    v ? new Date(v).toLocaleDateString() : "-";

  // DRIVER VIEW (SELLING MODE)
  if (!isAdmin && route) {
    return (
      <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
        <div className="flex justify-center mb-4">
          <SearchBar
            placeholder="Search products..."
            onSearch={setSearch}
            debounce
          />
          <RefreshButton onRefresh={reload}/>
        </div>

        <table className="w-full text-left text-sm lg:text-lg">
          <thead>
            <tr className="border-b">
              <th className="p-2">Product</th>
              <th className="p-2">Available</th>
              <th className="p-2 text-center">Sell</th>
            </tr>
          </thead>
          <tbody>
            {route.inventory
              .filter((it: any) =>
                it.product.name.toLowerCase().includes(search.toLowerCase())
              )
              .map((it: any) => (
                <tr
                  key={it.product._id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2">{it.product.name}</td>
                  <td className="p-2">{it.quantity}</td>
                  <td className="p-2 text-center">
                    <button
                      className="bg-green-500 text-white px-5 py-3 rounded-xl hover:bg-green-300 transition-all"
                      disabled={it.quantity === 0}
                      onClick={() => {
                        setSelectedProduct(it);
                        setSaleModalOpen(true);
                      }}
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ADMIN VIEW (HISTORY MODE)
  return (
    <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
      <div className="flex justify-center mb-4">
        <SearchBar
          placeholder="Search direct sales..."
          onSearch={setSearch}
          debounce
        />
      </div>

      <table className="w-full text-left text-sm lg:text-lg">
        <thead>
          <tr className="border-b">
            <th className="p-2">Client</th>
            <th className="p-2">Total</th>
            <th className="p-2">Route</th>
            <th className="p-2">Sold By</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((it: any) => (
            <tr
              key={it._id}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedSale(it)}
            >
              <td className="p-2 whitespace-nowrap">{it.client?.clientName}</td>
              <td className="p-2 whitespace-nowrap">{formatCurrency(it.total)}</td>
              <td className="p-2 whitespace-nowrap">{it.route?.code}</td>
              <td className="p-2 whitespace-nowrap">
                {it.createdBy?.firstName} {it.createdBy?.lastName}
              </td>
              <td className="p-2 whitespace-nowrap">{formatDate(it.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
