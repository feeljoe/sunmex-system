"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "../ui/SearchBar";
import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import { ExportExcelButton } from "../ui/ExportExcelButton";
import SubmitResultModal from "../modals/SubmitResultModal";
import { PaginatedSelect } from "../ui/PaginatedSelect";
import { formatCurrency } from "@/utils/format";

export function InventoryTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const { items, total, meta, reload } = useList("/api/productInventory", {
    page,
    limit,
    search,
    brand: selectedBrand,
    type: selectedType,
  });

  const [submitStatus, setSubmitStatus] = useState<"loading"| null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, selectedBrand, selectedType]);
  
      const totalPages = total > 0? Math.ceil(total/limit): 1;
      const totalInventoryMoney = meta?.totalInventoryMoney ?? 0;

      const handleSetPage = (value:string) => {
        setSubmitStatus("loading");
        if(value === "back") {
          setPage((p) => Math.max(1, p - 1));
        } else {
          setPage(p => p + 1);
        }
      };

  return (
    <div className="bg-(--secondary) font-mono font-bold rounded-xl shadow-xl p-4 flex flex-col h-[80vh] w-[90vw]">
      <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
      <div className="flex gap-5 mb-5 items-center">
        <PaginatedSelect
          endpoint="/api/brands"
          value={selectedBrand}
          onChange={setSelectedBrand}
          placeholder="All Brands"
        />
        <PaginatedSelect
          endpoint="/api/types"
          value={selectedType}
          onChange={setSelectedType}
          placeholder="All Types"
        />
        {(selectedBrand || selectedType) && (
          <button 
            onClick={() => { setSelectedBrand(""); setSelectedType(""); }}
            className="text-md p-2 rounded-xl bg-red-400 text-white hover:underline hover:bg-red-200 transition-all duration:300 cursor-pointer whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>
      <div className="flex justify-between gap-4 mb-4 h-10">
        <SearchBar
          placeholder="Search inventory..."
          onSearch={setSearch}
          debounce
        />
          <ExportExcelButton/>
          <RefreshButton onRefresh={() => {
            setSubmitStatus("loading");
            reload();
            setTimeout(() => setSubmitStatus(null), 3000);
          }}
          />
      </div>
      <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
      <table className="w-full text-left text-sm">
        <thead className="bg-(--tertiary) sticky top-0">
          <tr className="border-b whitespace-nowrap text-center">
            <th className="p-2">SKU</th>
            <th className="p-2">UPC</th>
            <th className="p-2 text-left">Brand</th>
            <th className="p-2">Name</th>
            <th className="p-2">Category</th>
            <th className="p-2">Inventory $</th>
            <th className="p-2">Current Inventory</th>
            <th className="p-2">Presaved Inventory</th>
            <th className="p-2">On Route Inventory</th>
            <th className="p-2">Inactive Inventory</th>
          </tr>
        </thead>
        <tbody className="bg-white">
        {items.length === 0 && (
            <tr>
              <td colSpan={10} className='p-4 text-center text-2xl text-gray-600'>
                No Inventory found
              </td>
            </tr>
          )}
          {items.map((it: any) => (
            <tr key={it._id} className="border-b whitespace-nowrap">
              <td className="p-2">{it.product?.sku}</td>
              <td className="p-2">{it.product?.upc}</td>
              <td className="p-2 capitalize">{it.product?.brand?.name?.toLowerCase()}</td>
              <td className="p-2 capitalize">
                <p>{it.product?.name?.toLowerCase()} {(it.product?.unit) &&(<>{it.product?.weight}{it.product?.unit?.toUpperCase()}</>)}</p>
                <p>{it.product?.caseSize && (<>({it.product?.caseSize} units per case)</>)}</p>
              </td>
              <td className="p-2 capitalize">{it.product?.productType?.name?.toLowerCase()}</td>
              <td className={`p-2 text-right ${it.currentInventory === 0? "text-red-600": ""}`}>{formatCurrency(Number(it.currentInventory * it.product.unitCost))}</td>
              <td className={`p-2 text-center ${it.currentInventory === 0? "text-red-600": ""}`}>{Math.round(it.currentInventory)}</td>
              <td className="p-2 text-center">{Math.round(it.preSavedInventory)}</td>
              <td className="p-2 text-center">{Math.round(it.onRouteInventory)}</td>
              <td className="p-2 text-center">{Math.round(it.inactiveInventory)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-between font-mono font-bold items-center mt-4">
        <span className="font-bold text-xl">Total Inventory Money: {formatCurrency(Number(totalInventoryMoney))}</span>
        <div className="flex gap-4 items-center">
        <span>
          Showing {items.length} of {total} total inventory
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
      {/* Loading animation */}
      {submitStatus && (
          <SubmitResultModal
              status={submitStatus}
              message={""}
              onClose={() => setSubmitStatus(null)}
              collection="General Reports"
          />
      )}
    </div>   
  );
}
