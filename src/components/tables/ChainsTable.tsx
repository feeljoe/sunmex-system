"use client";
import { useList } from '@/utils/useList';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../modals/ConfirmModal';
import SubmitResultModal from '../modals/SubmitResultModal';
import { chainConfirmConfig } from '../modals/configConfirms/confirmConfig';
import { SearchBar } from '../ui/SearchBar';
import { RefreshButton } from '../ui/RefreshButton';
import Link from 'next/link';

export function ChainsTable() {

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const { items, total, reload } = useList('/api/chains', {
    page,
    limit,
    search,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chainToDelete, setChainToDelete] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSetPage = (value:string) => {
    setSubmitStatus("loading");
    if(value === "back") {
      setPage((p) => Math.max(1, p - 1));
    } else {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);}, 1000);
  }, [handleSetPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setTimeout(() => { setSubmitStatus(null); }, 3000);
  }, [reload]);

  const requestDelete = (chain: any) => {
    setChainToDelete(chain);
    setConfirmOpen(true);
  };

  const confirmDelete = async (id: string) => {
    setMessage(null);
    setSubmitStatus("loading");
    try {
      if (!chainToDelete) return;
      await fetch(`/api/chains/${id}`, {
        method: "DELETE",
      });
      setMessage("Chain deleted successfully");
      setSubmitStatus("success")
      setChainToDelete(null);
      reload();
    } catch (err: any) {
      setMessage(err.message || "Error");
      setSubmitStatus("error");
    }

  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setChainToDelete(null);
  };
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  return (
    <>
      <div className='w-full h-full'>
        <div className="flex items-center justify-end p-2">
          <Link href="/pages/management/chains/add-chain">
            <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
                Add Chain
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
            </button>
          </Link>
        </div>
        <div className='flex flex-col h-[75vh] bg-(--secondary) shadow-xl rounded-xl p-5'>
          <div className="flex justify-between items-center gap-5 mb-4">
            <SearchBar
              placeholder="Search chains..."
              onSearch={setSearch}
              debounce
            />
            <RefreshButton onRefresh={() => { reload(); setSubmitStatus("loading"); }} />
          </div>
          <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
            <table className='w-full text-left'>
              <thead className='sticky top-0 z-10 bg-(--tertiary)'>
                <tr className='border-b-3 text-lg font-mono'>
                  <th className='px-4 py-2'>Name</th>
                  <th className="px-4 py-2 text-center">Edit</th>
                  <th className='px-4 py-2 text-center'>Delete</th>
                </tr>
              </thead>
              <tbody className='bg-white'>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className='p-4 text-center text-2xl text-gray-800'>
                      No chains found
                    </td>
                  </tr>
                )}
                {items.map((it: any) => (
                  <tr key={it._id} className='border-b border-gray-400 font-mono font-bold whitespace-nowrap'>
                    <td className='px-4 py-2 capitalize w-full'>{it.name.toLowerCase()}</td>
                    <td className='px-4 py-2 text-center'>
                      <button className="text-blue-800 bg-blue-400 p-2 text-lg rounded-xl hover:bg-blue-800 hover:text-white cursor-pointer transition-all duration:500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                    </td>
                    <td className='px-4 py-2 text-center'>
                        <button className='text-red-800 bg-red-400 p-2 text-lg rounded-xl hover:bg-red-800 hover:text-white cursor-pointer transition-all duration:500' onClick={() => requestDelete(it)}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
              Showing {items.length} of {total} chains
            </span>
            <button
              disabled={page === 1}
              onClick={() => handleSetPage("back")}
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
              onClick={() => handleSetPage("forward")}
              className={`p-2 bg-blue-400 text-blue-800 rounded-xl shadow-xl ${page >= totalPages ? "" : "hover:bg-blue-800 hover:text-white cursor-pointer"} disabled:opacity-50`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {confirmOpen &&
        <ConfirmModal
          open={confirmOpen}
          title="Confirm Chain Deletion"
          data={chainToDelete}
          sections={chainConfirmConfig}
          onConfirm={() => {
            confirmDelete(chainToDelete._id);
            setConfirmOpen(false);
          }}
          onBack={cancelDelete}
        />
      }
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
          }}
          collection="Chain"
        />
      )}
    </>
  );
}