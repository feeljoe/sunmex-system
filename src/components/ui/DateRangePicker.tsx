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

    // 🔥 click selected start again = clear
    if (dateISO === fromDate && !toDate) {
      onChange("", "");
      setSelecting("from");
      return;
    }

    if (selecting === "from") {
      onChange(dateISO, "");
      setSelecting("to");
      return;
    }

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
      <div className="w-60">

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
    <div ref={containerRef} className="relative">

      <button
        onClick={() => setOpen(o => !o)}
        className="rounded-xl shadow-xl bg-white px-3 py-2 text-sm flex gap-2"
      >
        {fromDate && toDate ? `${fromDate} → ${toDate}` : "Select range"}

        {(fromDate || toDate) && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("", "");
            }}
            className="text-red-500 cursor-pointer"
          >
            ✕
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-[9999] bg-white shadow-xl rounded-xl p-4 mt-2"
          >

            <div className="flex flex-col gap-4 items-center">

              {/* PRESETS */}
              <div className="flex gap-4 text-sm font-bold">
                <button onClick={() => applyPreset("today")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">Today</button>
                <button onClick={() => applyPreset("yesterday")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">Yesterday</button>
                <button onClick={() => applyPreset("last7")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">Last 7 days</button>
                <button onClick={() => applyPreset("last30")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">Last 30 days</button>
                <button onClick={() => applyPreset("ytd")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">Year to date</button>
                <button onClick={() => applyPreset("thisMonth")} className="bg-(--secondary) px-3 py-1 whitespace-nowrap rounded-xl shadow-xl cursor-pointer">This month</button>
              </div>

              {/* DUAL CALENDAR */}
              <div className="flex gap-6 border p-3 rounded-xl">

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