"use client";

import { useState, useRef, useEffect } from "react";

interface StaticSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
}

export function StaticSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option...",
}: StaticSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Find the current label based on the selected value
    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative w-48 lg:w-64" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center bg-white px-4 py-2 rounded-xl shadow-xl text-left outline-hidden cursor-pointer h-10"
            >
                <span className="truncate text-gray-700 capitalize">
                    {selectedOption ? selectedOption.label.toLowerCase() : placeholder.toLowerCase()}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white text-white border rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <div className="max-h-48 lg:max-h-64 overflow-y-auto p-1 shadow-sm">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full text-left px-3 py-2 text-sm text-gray-800 capitalize font-semibold rounded-lg hover:bg-blue-200 cursor-pointer transition-colors ${
                                    value === opt.value ? "bg-blue-400 text-blue-800" : ""
                                }`}
                            >
                                {opt.label.toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}