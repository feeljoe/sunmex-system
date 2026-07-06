"use client";
import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import RouteFormModal from "../forms/AddRouteForm";
import { RefreshButton } from "../ui/RefreshButton";
import { SearchBar } from "../ui/SearchBar";
import SubmitResultModal from "../modals/SubmitResultModal";

export function RouteList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const { items: routes, total, reload } = useList("/api/routes", {
    page,
    limit,
    search
  });
  const [submitStatus, setSubmitStatus] = useState<"loading" | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const totalPages = total > 0? Math.ceil(total/limit): 1;

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="bg-(--secondary) rounded-xl font-bold font-mono shadow-xl p-6 flex flex-col h-[80vh] w-[90vw]">
      <div className="flex justify-end mb-8">
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="bg-blue-400 text-blue-800 hover:text-white p-2 rounded-xl cursor-pointer hover:bg-blue-800 transition-all duration:300"
        >
          New Route
        </button>
      </div>

      <div className="flex justify-between gap-4 mb-4">
              <SearchBar
                placeholder="Search routes..."
                onSearch={setSearch}
                debounce
              />
              <RefreshButton onRefresh={() => {
                setSubmitStatus("loading");
                reload(); 
                setTimeout(() => setSubmitStatus(null), 3000);
                }}/>
            </div>
            <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
      <table className="w-full text-left">
        <thead className="bg-(--tertiary) sticky top-0">
          <tr className="border-b">
            <th className="p-2">Code</th>
            <th className="p-2">Type</th>
            <th className="p-2">Users</th>
            <th className="p-2">Clients</th>
            <th className="p-2 text-right">Edit</th>
          </tr>
        </thead>
        <tbody className="bg-white">
        {routes.length === 0 && (
            <tr>
              <td colSpan={5} className='p-4 text-center text-2xl text-gray-600'>
                No routes found
              </td>
            </tr>
          )}
          {routes.map((r: any) => (
            <tr key={r._id} className="border-b whitespace-nowrap">
              <td className="p-2">{r.code}</td>
              <td className="p-2 capitalize">{r.type}</td>
              <td className="p-2">{r.user?.firstName ?? "-"} {r.user?.lastName ?? "-"}</td>
              <td className="p-2">
                {r.type === "vendor" ? r.clients?.length ?? 0 : "-"}
              </td>
              <td className="p-2 text-right">
                <button
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                  className="text-blue-800 bg-blue-400 rounded-xl p-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex justify-end font-mono font-bold items-center gap-4 mt-4">
        <span>
          Showing {routes.length} of {total} Routes
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
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={""}
          onClose={() => setSubmitStatus(null)}
          collection="Routes"
        />
      )}
    </div>
  );
}
