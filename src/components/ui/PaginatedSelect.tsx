"use client";

import { useState, useRef, useEffect } from "react";
import { useList } from "@/utils/useList";

interface PaginatedSelectProps {
    endpoint: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    labelKey?: string;
    valueKey?: string;
}

export function PaginatedSelect({
    endpoint,
    value,
    onChange,
    placeholder = "Select an option...",
    labelKey = "name",
    valueKey = "_id",
}: PaginatedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedLabel, setSelectedLabel] = useState("");

    const limit = 20;
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const {items, total, loading} = useList(endpoint, {
        page,
        limit,
        search,
    });

    const totalPages = total > 0 ? Math.ceil(total/limit) : 1;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if(dropdownRef.current && !dropdownRef.current.contains(event.target as Node)){
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const handleSelect = (item: any) => {
        onChange(item[valueKey]);
        setSelectedLabel(item[labelKey]);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-48 lg:w-64" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center bg-white px-4 py-2 rounded-xl shadow-xl text-left outline-hidden cursor-pointer"
            >
                <span className="truncate text-gray-700 capitalize">
                    {value ? selectedLabel?.toLowerCase() || "Item Selected": placeholder}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-(--secondary) text-white border rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-1 bg-white text-gray-400">
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl text-md outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="h-48 lg:h-64 max-h-48 lg:max-h-64 overflow-y-auto p-1 shadow-sm">
                        {loading ? (
                            <p className="text-center text-sm text-gray-400 py-4">Loading...</p>
                        ): items.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-4">No results found.</p>
                        ): (
                            items.map((item: any) => (
                                <button
                                    key={item[valueKey]}
                                    onClick={() => handleSelect(item)}
                                    className={`w-full text-left px-3 py-2 text-sm text-gray-800 capitalize font-semibold rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${
                                        value === item[valueKey] ? "bg-blue-600 text-white" : ""
                                    }`}>
                                        {item[labelKey]?.toLowerCase()}
                                    </button>
                            ))
                        )}
                    </div>
                    <div className="flex justify-between items-center p-2 text-sm">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-1 bg-gray-400 rounded-xl disabled:opacity-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                            Prev
                        </button>
                        <span className="text-gray-500">
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-2 py-1 bg-green-400 rounded-xl disabled:opacity-50 hover:bg-green-100 cursor-pointer transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}