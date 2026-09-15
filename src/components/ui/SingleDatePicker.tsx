"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    text?: string;
    value: string;
    onChange: (val: string) => void;
    hasError?: boolean;
    reason: string;
};

function toISO(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseISO(iso: string) {
    if (!iso) return new Date();
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, n: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function formatDisplayDate(iso: string) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${m}-${d}-${y}`;
}

export function SingleDatePicker({ text, value, onChange, hasError, reason }: Props) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [viewDate, setViewDate] = useState(startOfMonth(parseISO(value)));

    // Ensure createPortal only runs on the client-side to prevent Next.js SSR errors
    useEffect(() => {
        setMounted(true);
    }, []);

    function buildCalendar(monthDate: Date) {
        const start = startOfMonth(monthDate);
        const firstDay = start.getDay();
        const gridStart = addDays(start, -firstDay);
        return Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i));
    }

    function handleSelect(dateISO: string) {
        onChange(dateISO);
        setTimeout(() => setOpen(false), 150);
    }

    function applyPreset(type: string) {
        const now = new Date();
        let target = now;

        if (type === "today") target = now;
        if (type === "nextWeek") target = addDays(now, 7);
        if (type === "1month") target = new Date(now.setMonth(now.getMonth() + 1));
        if (type === "3months") target = new Date(now.setMonth(now.getMonth() + 3));
        if (type === "6months") target = new Date(now.setMonth(now.getMonth() + 6));
        if (type === "1year") target = new Date(now.setFullYear(now.getFullYear() + 1));

        onChange(toISO(target));
        setOpen(false);
    }

    const days = buildCalendar(viewDate);
    const monthLabel = viewDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });

    // The actual calendar modal that will be teleported to the body
    const calendarModal = (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)} // Clicking the backdrop closes it
                    className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={(e) => e.stopPropagation()} // Prevent clicking the calendar from closing it
                        className="bg-(--tertiary) shadow-2xl rounded-2xl p-4 w-full max-w-sm"
                    >
                        {/* MODAL HEADER */}
                        <div className="flex justify-between items-center mb-4 font-mono">
                            <h3 className="font-bold text-lg">{text ? text : "Select Expiration"}</h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-white bg-red-500 hover:bg-red-200 rounded-xl p-2 transition-colors cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 items-center font-mono">
                            {/* PRESETS */}
                            {reason === "good return" && (
                                <div className="flex flex-wrap justify-center gap-2 text-xs text-blue-800 font-bold">
                                    <button onClick={() => applyPreset("today")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">Today</button>
                                    <button onClick={() => applyPreset("nextWeek")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">+1 Wk</button>
                                    <button onClick={() => applyPreset("1month")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">+1 Mo</button>
                                    <button onClick={() => applyPreset("3months")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">+3 Mo</button>
                                    <button onClick={() => applyPreset("6months")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">+6 Mo</button>
                                    <button onClick={() => applyPreset("1year")} className="bg-blue-400 border border-blue-500 px-2 py-1 hover:bg-blue-800 hover:text-white transition-colors rounded-lg shadow-sm">+1 Yr</button>
                                </div>
                            )}

                            {/* SINGLE CALENDAR */}
                            <div className="w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="px-2 font-bold text-gray-500 hover:text-blue-500 text-lg">◀</button>
                                    <div className="font-semibold text-sm">{monthLabel}</div>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="px-2 font-bold text-gray-500 hover:text-blue-500 text-lg">▶</button>
                                </div>

                                <div className="grid grid-cols-7 text-center text-xs mb-2">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                        <div className="font-bold text-gray-400" key={d}>{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                                    {days.map((d, i) => {
                                        const iso = toISO(d);
                                        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                                        const isSelected = iso === value;

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSelect(iso)}
                                                className={`h-8 w-8 mx-auto rounded-full text-xs transition-colors flex items-center justify-center
                          ${!isCurrentMonth ? "opacity-30" : "hover:bg-blue-100"}
                          ${isSelected ? "bg-blue-500 text-white font-bold hover:bg-blue-600" : ""}
                        `}
                                            >
                                                {d.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative whitespace-nowrap h-9 w-full sm:w-auto">
            {/* THE BUTTON */}
            <button
                onClick={() => setOpen(true)}
                className={`h-full w-full items-center justify-center rounded-xl shadow-sm font-bold font-mono px-3 py-1.5 gap-2 text-sm flex cursor-pointer transition-all duration-300 border ${hasError
                        ? "bg-red-50 text-red-900 border-red-400 hover:bg-red-100"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-blue-800 hover:text-white hover:border-blue-800"
                    }`}
            >
                {value ? (
                    formatDisplayDate(value)
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z" />
                        </svg>
                        Select Date
                    </>
                )}
            </button>

            {/* THE PORTAL: Injects the calendar directly into the page body */}
            {mounted && typeof document !== "undefined" && createPortal(calendarModal, document.body)}
        </div>
    );
}