"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";

export function InventoryTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const { items, total, meta, reload } = useList("/api/productInventory", {
    page,
    limit,
    search,
  });
  useEffect(() => {
        setPage(1);
      }, [search]);
  
      const totalPages = total > 0? Math.ceil(total/limit): 1;
      const totalInventoryMoney = meta?.totalInventoryMoney ?? 0;
      const formatCurrency = (v?: number) =>
        v != null ? `$${v.toFixed(2)}` : "-";

  return (
    <div className="bg-(--secondary) rounded-lg shadow-xl p-4 lg:p-10 flex flex-col h-4/5">
      <div className="flex justify-between mb-4">
        <SearchBar
          placeholder="Search inventory..."
          onSearch={setSearch}
          debounce
        />
        <RefreshButton onRefresh={reload}/>
      </div>
      <div className='flex-1 overflow-auto'>
      <table className="w-full text-left text-sm lg:text-lg">
        <thead>
          <tr className="border-b">
            <th className="p-2">SKU</th>
            <th className="p-2">UPC</th>
            <th className="p-2">Brand</th>
            <th className="p-2">Name</th>
            <th className="p-2">Inventory $</th>
            <th className="p-2">Current Inventory</th>
            <th className="p-2">Presaved Inventory</th>
            <th className="p-2">On Route Inventory</th>
          </tr>
        </thead>
        <tbody>
        {items.length === 0 && (
            <tr>
              <td colSpan={8} className='p-4 text-center text-gray-500'>
                No Inventory found
              </td>
            </tr>
          )}
          {items.map((it: any) => (
            <tr key={it._id} className="border-b">
              <td className="p-2 whitespace-nowrap">{it.product?.sku}</td>
              <td className="p-2 whitespace-nowrap">{it.product?.upc}</td>
              <td className="p-2 whitespace-nowrap">{it.product?.brand.name}</td>
              <td className="p-2 whitespace-nowrap">{it.product?.name}</td>
              <td className={`p-2 whitespace-nowrap ${it.currentInventory === 0? "text-red-500": ""}`}>${Number(it.currentInventory * it.product.unitCost).toFixed(2)}</td>
              <td className={`p-2 whitespace-nowrap ${it.currentInventory === 0? "text-red-500": ""}`}>{Number(it.currentInventory).toFixed()}</td>
              <td className="p-2 whitespace-nowrap">{Number(it.preSavedInventory).toFixed()}</td>
              <td className="p-2 whitespace-nowrap">{Number(it.onRouteInventory).toFixed()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="mt-4">
        <span className="font-bold text-2xl">Total Inventory Money: {formatCurrency(Number(totalInventoryMoney))}</span>
      </div>
      <div className="flex justify-end items center gap-4 mt-4">
        <span className='mt-1'>
          Showing {items.length} of {total} product inventory
        </span>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 bg-(--quarteary) text-white rounded-xl shadow-xl disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>

        <span className="px-3 py-1">
          Page {page} of {totalPages || 1}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 bg-(--quarteary) text-white rounded-xl disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>   
  );
}
