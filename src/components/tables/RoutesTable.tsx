"use client";
import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import RouteFormModal from "../forms/AddRouteForm";
import { RefreshButton } from "../ui/RefreshButton";
import { SearchBar } from "../ui/SearchBar";

export function RouteList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const { items: routes, total, reload } = useList("/api/routes", {
    page,
    limit,
    search
  });
  useEffect(() => {
          setPage(1);
        }, [search]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const totalPages = total > 0? Math.ceil(total/limit): 1;
  return (
    <div className="bg-(--secondary) rounded-xl shadow p-6 flex flex-col h-4/5">
      <div className="flex justify-end mb-8">
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="bg-blue-500 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-300 transition-all duration:300"
        >
          New Route
        </button>
      </div>

      <div className="flex justify-between mb-4">
              <SearchBar
                placeholder="Search routes..."
                onSearch={setSearch}
                debounce
              />
              <RefreshButton onRefresh={reload}/>
            </div>
            <div className='flex-1 overflow-auto'>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Code</th>
            <th className="p-2">Type</th>
            <th className="p-2">Users</th>
            <th className="p-2">Clients</th>
            <th className="p-2 text-right">Edit</th>
          </tr>
        </thead>
        <tbody>
        {routes.length === 0 && (
            <tr>
              <td colSpan={8} className='p-4 text-center text-gray-500'>
                No routes found
              </td>
            </tr>
          )}
          {routes.map((r: any) => (
            <tr key={r._id} className="border-b">
              <td className="p-2 whitespace-nowrap">{r.code}</td>
              <td className="p-2 capitalize whitespace-nowrap">{r.type}</td>
              <td className="p-2 whitespace-nowrap">{r.user?.firstName ?? "-"} {r.user?.lastName ?? "-"}</td>
              <td className="p-2 whitespace-nowrap">
                {r.type === "vendor" ? r.clients?.length ?? 0 : "-"}
              </td>
              <td className="p-2 text-right whitespace-nowrap">
                <button
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                  className="text-blue-600 underline whitespace-nowrap"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end items center gap-4 mt-4">
        <span className='mt-1'>
          Showing {routes.length} of {total} routes
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
      {open && (
        <RouteFormModal
          route={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
