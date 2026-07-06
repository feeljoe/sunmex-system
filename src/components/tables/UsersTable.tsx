"use client";

import { useEffect, useState } from "react";
import { ConfirmModal } from "../modals/ConfirmModal";
import { userConfirmConfig } from "../modals/configConfirms/confirmConfig";
import SubmitResultModal from "../modals/SubmitResultModal";
import { SearchBar } from "../ui/SearchBar";
import { useList } from "@/utils/useList";
import { RefreshButton } from "../ui/RefreshButton";
import { EditUserModal } from "../modals/EditUserModal";
import Link from "next/link";


export function UsersTable() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);
    const [search, setSearch] = useState("");
    const { items, total, reload } = useList('/api/users', {
        page,
        limit,
        search,
    });

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        setTimeout(() => { setSubmitStatus(null); }, 3000);
    }, [reload]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<any | null>(null);

    const requestDelete = (user: any) => {
        setUserToDelete(user);
        setConfirmOpen(true);
    };

    const confirmDelete = async (id: string) => {
        setMessage(null);
        setSubmitStatus("loading");
        try {
            if (!userToDelete) return;
            await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });
            setMessage("User deleted successfully");
            setSubmitStatus("success")
            setUserToDelete(null);
            reload();
        } catch (err: any) {
            setMessage(err.message || "Error");
            setSubmitStatus("error");
        }

    };

    const cancelDelete = () => {
        setConfirmOpen(false);
        setUserToDelete(null);
    };
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
    items.sort((a, b) => {
        const roleA = a.userRole;
        const roleB = b.userRole;
        const nameA = a.firstName;
        const nameB = b.firstName;
        if (roleA < roleB) return -1;
        if (roleA > roleB) return 1;
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    const handleSetPage = (value: string) => {
        setSubmitStatus("loading");
        if (value === "back") {
            setPage((p) => Math.max(1, p - 1));
        } else {
            setPage(p => p + 1);
        }
    };

    return (
        <>
            <div className='h-[75vh] w-[90vw]'>
                <div className="flex items-center justify-end py-2">
                    <Link href="/pages/management/users/add-user">
                        <button className="flex gap-4 p-3 mb-1 font-mono font-bold rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-all duration:300 hover:-translate-y-2 cursor-pointer">
                            Add User
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                            </svg>
                        </button>
                    </Link>
                </div>
                <div className='flex flex-col w-full h-full bg-(--secondary) shadow-xl rounded-xl p-5'>
                    <div className="flex justify-between items-center gap-5 mb-4">
                        <SearchBar
                            placeholder="Search Users..."
                            onSearch={setSearch}
                            debounce
                        />
                        <RefreshButton onRefresh={() => { reload(); setSubmitStatus("loading"); }} />
                    </div>
                    <div className='flex-1 overflow-auto rounded-xl shadow-xl'>
                        <table className="w-full text-left font-mono font-bold">
                            <thead className="bg-(--tertiary) sticky top-0">
                                <tr className="border-b">
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Username</th>
                                    <th className="p-2">Role</th>
                                    <th className="p-2 text-right">Edit</th>
                                    <th className="p-2 text-right">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {items.map((it: any) => (
                                    <tr key={it._id} className="border-b">
                                        <td className="p-2 whitespace-nowrap capitalize">{it.firstName.toLowerCase()} {it.lastName.toLowerCase()}</td>
                                        <td className="p-2 whitespace-nowrap">{it.username.toLowerCase()}</td>
                                        <td className="p-2 capitalize whitespace-nowrap capitalize">{it.userRole.toLowerCase()}</td>
                                        <td className="p-2 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => setEditUser(it)}
                                                className="text-blue-800 bg-blue-400 p-2 rounded-xl cursor-pointer hover:bg-blue-800 hover:text-white transition-all duration:300"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td className='p-2 text-right whitespace-nowrap'>
                                            <button className='text-red-800 bg-red-400 p-2 rounded-xl cursor-pointer hover:bg-red-800 hover:text-white transition-all duration:300'
                                                onClick={() => requestDelete(it)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
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
                            Showing {items.length} of {total} users
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
                {editUser && (
                    <EditUserModal
                        user={editUser}
                        onClose={() => setEditUser(null)}
                        onSaved={reload}
                    />
                )}
                {confirmOpen &&
                    <ConfirmModal
                        open={confirmOpen}
                        title="Confirm User Deletion"
                        data={userToDelete}
                        sections={userConfirmConfig}
                        onConfirm={() => {
                            confirmDelete(userToDelete._id);
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
                        collection="User"
                    />
                )}
            </div>
        </>
    );
}