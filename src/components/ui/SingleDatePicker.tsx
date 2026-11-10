
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  text?: string;
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  reason: string;
  autoOpen?: boolean;
};

type CalendarView = "month" | "year";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseISO(value: string): Date {
  if (!value) return new Date();

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime())
    ? new Date()
    : date;
}

function startOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function addDays(date: Date, amount: number): Date {
  const updated = new Date(date);
  updated.setDate(updated.getDate() + amount);
  return updated;
}

function formatDisplayDate(value: string): string {
  if (!value) return "";

  const [year, month, day] = value.split("-");
  return `${month}-${day}-${year}`;
}

// Calendar cells for a single month.
// Leading and trailing dates complete the weekly grid.
function buildCalendar(
  year: number,
  month: number,
  fixedSixWeeks = false
): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const totalCells = fixedSixWeeks
    ? 42
    : Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const gridStart = addDays(firstDay, -startOffset);

  return Array.from(
    { length: totalCells },
    (_, index) => addDays(gridStart, index)
  );
}

export function SingleDatePicker({
  text,
  value,
  onChange,
  hasError,
  reason,
  autoOpen = false,
}: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [mounted, setMounted] = useState(false);

  const [calendarView, setCalendarView] =
    useState<CalendarView>("month");

  const [viewDate, setViewDate] = useState(() =>
    startOfMonth(parseISO(value))
  );

  const todayISO = toISO(new Date());

  const selectedDate = value || "";

  // Client-side portal support.
  useEffect(() => {
    setMounted(true);
  }, []);

  // On each opening, start at the selected date's month.
  useEffect(() => {
    if (!open) return;

    setViewDate(startOfMonth(parseISO(value)));
    setCalendarView("month");
  }, [open]);

  // Preserve the current year/month while switching views.
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const days = useMemo(
    () => buildCalendar(viewYear, viewMonth, true),
    [viewYear, viewMonth]
  );

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const startYear = Math.min(
      1950,
      currentYear - 20,
      viewYear
    );

    const endYear = Math.max(
      2100,
      currentYear + 50,
      viewYear
    );

    return Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => startYear + index
    );
  }, [viewYear]);

  const changeMonth = (offset: number) => {
    setViewDate(
      new Date(viewYear, viewMonth + offset, 1)
    );
  };

  const changeYear = (year: number) => {
    setViewDate(
      new Date(year, viewMonth, 1)
    );
  };

  const selectMonth = (month: number) => {
    setViewDate(new Date(viewYear, month, 1));
    setCalendarView("month");
  };

  const selectDate = (date: Date) => {
    onChange(toISO(date));
    setOpen(false);
  };

  const closeCalendar = () => {
    setOpen(false);
  };

  const applyPreset = (
    preset:
      | "today"
      | "nextWeek"
      | "1month"
      | "3months"
      | "6months"
      | "1year"
  ) => {
    const target = new Date();

    switch (preset) {
      case "nextWeek":
        target.setDate(target.getDate() + 7);
        break;
      case "1month":
        target.setMonth(target.getMonth() + 1);
        break;
      case "3months":
        target.setMonth(target.getMonth() + 3);
        break;
      case "6months":
        target.setMonth(target.getMonth() + 6);
        break;
      case "1year":
        target.setFullYear(target.getFullYear() + 1);
        break;
    }

    onChange(toISO(target));
    setOpen(false);
  };

  // Small month snapshot, used in the year overview.
  // The entire month is clickable; individual days are not.
  const renderMiniMonth = (month: number) => {
    const miniatureDays = buildCalendar(
      viewYear,
      month
    );

    const isSelectedMonth =
      !!selectedDate &&
      parseISO(selectedDate).getFullYear() === viewYear &&
      parseISO(selectedDate).getMonth() === month;

    return (
      <button
        key={month}
        type="button"
        onClick={() => selectMonth(month)}
        aria-label={`View ${MONTHS[month]} ${viewYear}`}
        className="min-w-0 rounded-xl p-1.5 text-left transition-colors hover:bg-blue-50 active:bg-blue-100"
      >
        <h4
          className={`mb-2 truncate text-sm font-bold ${
            isSelectedMonth
              ? "text-blue-600"
              : "text-gray-900"
          }`}
        >
          {MONTHS[month].slice(0, 3)}
        </h4>

        <div className="grid grid-cols-7 gap-y-1">
          {miniatureDays.map((date, index) => {
            const inMonth =
              date.getMonth() === month;

            const iso = toISO(date);

            const isSelected =
              iso === selectedDate;

            const isToday =
              iso === todayISO;

            return (
              <div
                key={`${month}-${index}`}
                className="flex aspect-square min-w-0 items-center justify-center"
              >
                {inMonth && (
                  <span
                    className={`flex aspect-square w-full max-w-5 items-center justify-center rounded-full text-[9px] leading-none sm:text-[10px] ${
                      isSelected
                        ? "bg-blue-600 font-bold text-white"
                        : isToday
                          ? "border border-blue-500 font-bold text-blue-600"
                          : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </button>
    );
  };

  const calendarModal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="calendar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCalendar();
            }
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-2 sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={text ?? "Select Date"}
            initial={{
              opacity: 0,
              scale: 0.94,
              y: 15,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.94,
              y: 15,
            }}
            transition={{
              duration: 0.22,
              ease: "easeOut",
            }}
            className="flex h-[min(620px, 90dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-center justify-between gap-3 bg-(--tertiary) p-3">
              <h2 className="min-w-0 truncate text-base font-bold sm:text-lg">
                {text ?? "Select Date"}
              </h2>

              <button
                type="button"
                onClick={closeCalendar}
                aria-label="Close calendar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* SCROLLABLE CALENDAR */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3 sm:p-4">
              <AnimatePresence mode="wait" initial={false}>
                {calendarView === "month" ? (
                  <motion.div
                    key="month-view"
                    initial={{
                      opacity: 0,
                      scale: 1.08,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.92,
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                    }}
                    className="flex min-h-full flex-col justify-between gap-4"
                  >
                    {/* YEAR: CLICK TO ZOOM OUT */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarView("year")
                        }
                        aria-label={`View all months of ${viewYear}`}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-3xl font-black text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        {viewYear}

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className="size-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m6 9 6 6 6-6"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* MONTH NAVIGATION */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        aria-label="Previous month"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200"
                      >
                        ‹
                      </button>

                      <h3 className="text-xl font-bold text-gray-900">
                        {MONTHS[viewMonth]}
                      </h3>

                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        aria-label="Next month"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200"
                      >
                        ›
                      </button>
                    </div>

                    {/* WEEKDAY HEADER */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEKDAYS.map((day, index) => (
                        <div
                          key={index}
                          className="py-2 text-xs font-bold text-gray-400"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* MONTH DAYS */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((date, index) => {
                        const iso = toISO(date);

                        const isCurrentMonth =
                          date.getMonth() === viewMonth;

                        const isSelected =
                          iso === selectedDate;

                        const isToday =
                          iso === todayISO;

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              selectDate(date)
                            }
                            aria-label={date.toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                            aria-pressed={isSelected}
                            className={`mx-auto flex h-11 w-11 max-w-full items-center justify-center rounded-full text-sm font-semibold transition-colors sm:text-base ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-md"
                                  : isToday
                                    ? "border-2 border-blue-500 text-blue-700"
                                    : isCurrentMonth
                                      ? "text-gray-900 hover:bg-blue-100"
                                      : "text-gray-300 hover:bg-gray-100"
                              }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="year-view"
                    initial={{
                      opacity: 0,
                      scale: 0.86,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 1.08,
                    }}
                    transition={{
                      duration: 0.22,
                      ease: "easeInOut",
                    }}
                    className="space-y-4"
                  >
                    {/* YEAR SELECTION */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          changeYear(viewYear - 1)
                        }
                        aria-label="Previous year"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200"
                      >
                        ‹
                      </button>

                      <div className="relative">
                        <select
                          aria-label="Select year"
                          value={viewYear}
                          onChange={(event) =>
                            changeYear(
                              Number(event.target.value)
                            )
                          }
                          className="cursor-pointer appearance-none rounded-xl bg-blue-50 py-2 pl-4 pr-9 text-3xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {years.map((year) => (
                            <option
                              key={year}
                              value={year}
                            >
                              {year}
                            </option>
                          ))}
                        </select>

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-blue-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m6 9 6 6 6-6"
                          />
                        </svg>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          changeYear(viewYear + 1)
                        }
                        aria-label="Next year"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200"
                      >
                        ›
                      </button>
                    </div>

                    <p className="text-center text-xs text-gray-500">
                      Select a month to view its dates
                    </p>

                    {/* ALL 12 MONTHS */}
                    <div className="grid grid-cols-4 gap-x-1 gap-y-4 sm:gap-x-3 sm:gap-y-5">
                      {MONTHS.map((_, month) =>
                        renderMiniMonth(month)
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GOOD RETURN PRESETS */}
              {reason === "good return" && (
                <div className="mt-5 border-t border-gray-200 pt-4">
                  <p className="mb-2 text-center text-xs font-semibold text-gray-500">
                    Quick Date Selection
                  </p>

                  <div className="flex flex-wrap justify-center gap-2">
                    {(
                      [
                        ["Today", "today"],
                        ["+1 Wk", "nextWeek"],
                        ["+1 Mo", "1month"],
                        ["+3 Mo", "3months"],
                        ["+6 Mo", "6months"],
                        ["+1 Yr", "1year"],
                      ] as const
                    ).map(([label, preset]) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          applyPreset(preset)
                        }
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-200"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 p-3">
              <button
                type="button"
                onClick={() => {
                  setViewDate(startOfMonth(new Date()));
                  setCalendarView("month");
                }}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Today
              </button>

              <span className="text-xs font-semibold text-gray-500">
                {selectedDate
                  ? `Selected: ${formatDisplayDate(selectedDate)}`
                  : "No date selected"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative h-9 whitespace-nowrap w-auto">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-sm font-bold shadow-sm transition-colors ${
          hasError
            ? "border-red-400 bg-red-50 text-red-900 hover:bg-red-100"
            : "border-gray-300 bg-white text-gray-700 hover:border-blue-600 hover:bg-blue-50"
        }`}
      >
        {value ? (
          formatDisplayDate(value)
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
            Select Date
          </>
        )}
      </button>

      {mounted &&
        createPortal(calendarModal, document.body)}
    </div>
  );
}