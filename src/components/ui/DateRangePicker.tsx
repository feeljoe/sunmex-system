"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
};

export function DateRangePicker({ fromDate, toDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const label =
    fromDate && toDate
      ? `${parseLocalDate(fromDate).toLocaleDateString()} → ${parseLocalDate(toDate).toLocaleDateString()}`
      : fromDate
      ? `${parseLocalDate(fromDate).toLocaleDateString()} → …`
      : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z" />
</svg>
;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div className="flex rounded-xl shadow-xl bg-white px-2 py-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-sm text-gray-700 text-center">{label} </span>
        </button>
        <div className="flex items-center ml-2">
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("", "");
              }}
              className="text-gray-400 hover:text-red-500"
              title="Clear dates"
            >
              ✕
            </button>
          )}
        </div>
        </div>
     

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] mt-2 w-40 rounded-lg bg-white shadow-xl p-4"
          >
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => onChange(e.target.value, toDate)}
                className="p-2 border rounded"
              />

              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => onChange(fromDate, e.target.value)}
                className="p-2 border rounded"
              />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 py-2 text-sm bg-(--quarteary) text-white rounded"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
