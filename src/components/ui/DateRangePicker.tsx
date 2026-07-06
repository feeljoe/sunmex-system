"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
};

type Selecting = "from" | "to";

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  if(!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

export function DateRangePicker({ fromDate, toDate, onChange }: Props) {

  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<Selecting>("from");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewDate, setViewDate] = useState(startOfMonth(today));

  const secondMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    1
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function buildCalendar(monthDate: Date) {
    const start = startOfMonth(monthDate);
    const firstDay = start.getDay();
    const gridStart = addDays(start, -firstDay);

    return Array.from({ length: 42 }).map((_, i) =>
      addDays(gridStart, i)
    );
  }

  function inRange(dateISO: string) {
    if (!fromDate) return false;
    const end = toDate || hoverDate;
    if (!end) return false;
    return dateISO >= fromDate && dateISO <= end;
  }

  function handleSelect(dateISO: string) {

    // STEP 1: selecting start
    if (selecting === "from") {
      onChange(dateISO, "");
      setSelecting("to");
      return;
    }
  
    // STEP 2: selecting end
  
    // ✅ same day → single-day range
    if (fromDate && dateISO === fromDate) {
      onChange(fromDate, fromDate);
      setSelecting("from");
      setHoverDate(null);
      setTimeout(() => setOpen(false), 150);
      return;
    }
  
    // normal range logic
    if (fromDate && dateISO < fromDate) {
      onChange(dateISO, fromDate);
    } else {
      onChange(fromDate, dateISO);
    }
  
    setSelecting("from");
    setHoverDate(null);
    setTimeout(() => setOpen(false), 150);
  }

  function applyPreset(type: string) {

    const now = new Date();
    const end = toISO(now);

    if (type === "today") onChange(end, end);
    if (type === "yesterday") {
      const y = toISO(addDays(now, -1));
      onChange(y, y);
    }
    if (type === "last7") onChange(toISO(addDays(now, -6)), end);
    if (type === "last30") onChange(toISO(addDays(now, -29)), end);
    if (type === "ytd") onChange(`${now.getFullYear()}-01-01`, end);
    if (type === "thisMonth") onChange(toISO(startOfMonth(now)), end);

    setOpen(false);
  }

  const days1 = buildCalendar(viewDate);
  const days2 = buildCalendar(secondMonth);

  const monthLabel1 = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthLabel2 = secondMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function renderCalendar(days: Date[], monthDate: Date) {

    return (
      <div className="w-60 font-mono">

        <div className="grid grid-cols-7 text-center text-xs mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div className="font-bold" key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">

          {days.map((d, i) => {

            const iso = toISO(d);
            const isCurrentMonth = d.getMonth() === monthDate.getMonth();
            const isSelected = iso === fromDate || iso === toDate;

            return (
              <button
                key={i}
                onClick={() => handleSelect(iso)}
                onMouseEnter={() => setHoverDate(iso)}
                className={`h-8 rounded text-xs hover:bg-blue-100
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${inRange(iso) ? "bg-blue-100" : ""}
                  ${isSelected ? "bg-blue-500 text-white" : ""}
                `}
              >
                {d.getDate()}
              </button>
            );
          })}

        </div>

      </div>
    );
  }

  return (
    <div ref={containerRef} className="whitespace-nowrap">

      <button
        onClick={() => setOpen(o => !o)}
        className="h-full items-center rounded-xl shadow-xl font-bold font-mono bg-white px-2 py-2 gap-2 text-sm flex cursor-pointer hover:bg-blue-800 hover:text-white transtition-all duration:300"
      >
        {fromDate && toDate 
          ? `${formatDisplayDate(fromDate)} → ${formatDisplayDate(toDate)}` 
          : fromDate 
            ? `${formatDisplayDate(fromDate)} → ...`
          : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z" />
            </svg>
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-[9999] bg-(--tertiary) border border-(--tertiary) shadow-xl rounded-xl px-3 py-1 mt-1"
          >

            <div className="flex flex-col gap-4 items-center font-mono w-130">

              {/* PRESETS */}
              <div className="flex flex-wrap justify-center gap-4 text-sm text-blue-800 font-bold">
                <button onClick={() => applyPreset("today")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">Today</button>
                <button onClick={() => applyPreset("yesterday")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">Yesterday</button>
                <button onClick={() => applyPreset("last7")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">Last 7 days</button>
                <button onClick={() => applyPreset("last30")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">Last 30 days</button>
                <button onClick={() => applyPreset("ytd")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">Year to date</button>
                <button onClick={() => applyPreset("thisMonth")} className="bg-blue-400 border border-blue-500 px-2 py-1 whitespace-nowrap hover:bg-blue-800 hover:text-white transition-colors duration:500 rounded-xl shadow-xl cursor-pointer">This month</button>
              </div>

              {/* DUAL CALENDAR */}
              <div className="flex gap-4 bg-white p-2 rounded-xl mb-3 shadow-xl">

                <div>
                  <div className="flex justify-between mb-2">
                    <button onClick={() =>
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                    }>◀</button>

                    <div className="font-semibold">{monthLabel1}</div>

                    <div className="w-4" />
                  </div>

                  {renderCalendar(days1, viewDate)}
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <div className="w-4" />

                    <div className="font-semibold">{monthLabel2}</div>

                    <button onClick={() =>
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                    }>▶</button>
                  </div>

                  {renderCalendar(days2, secondMonth)}
                </div>

              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}