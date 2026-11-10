"use client";
import { useEffect, useState } from "react";
import { DateRangePicker } from "../ui/DateRangePicker";

type Filters = Record<string, string>;
type Props = {
    isOpen: boolean;
    onClose: () => void;
    onApply: (values: {
        dates: { from: string; to: string; };
        vendor: string;
        route: string;
        activeFilters: Filters;
    }) => void;
    userRole: string;
    dates: { from: string; to: string; };
    vendorInput: string;
    routeInput: string;
    activeFilters: Filters;
    vendors: any[];
    routes: any[];
};

const statuses = [
    { label: "Pending", value: "pending" },
    { label: "Received", value: "received" },
    { label: "Cancelled", value: "cancelled" },
];

const fieldClass = "min-h-11 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-blue-500";

export default function CreditMemoMobileFiltersModal({
    isOpen, onClose, onApply, userRole, dates, vendorInput, routeInput, activeFilters, vendors, routes,
}: Props) {
    const [draftDates, setDraftDates] = useState(dates);
    const [vendor, setVendor] = useState(vendorInput);
    const [route, setRoute] = useState(routeInput);
    const [filters, setFilters] = useState<Filters>(activeFilters);
    const isAdmin = userRole === "admin";
    useEffect(() => {
        if (!isOpen) return;
        setDraftDates({ ...dates });
        setVendor(vendorInput);
        setRoute(routeInput);
        setFilters({ ...activeFilters });
    }, [isOpen, dates, vendorInput, routeInput, activeFilters]);
    useEffect(() => {
        if (!isOpen) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    const toggleStatus = (status: string) => {
        setFilters((previous) => {
            const next = { ...previous };

            if (next.status === status) {
                delete next.status;
            } else {
                next.status = status;
            }

            return next;
        });
    };

    const updateAmount = (
        key: "total" | "subtotal",
        value: string
    ) => {
        setFilters((previous) => {
            const next = { ...previous };

            if (value.trim() === "") {
                delete next[key];
            } else {
                next[key] = value;
            }

            return next;
        });
    };

    const clearAll = () => {
        setVendor("");
        setRoute("");
        setFilters({});
    };

    const invalidDates =
        !draftDates.from ||
        !draftDates.to ||
        draftDates.from > draftDates.to;

    const apply = () => {
        if (invalidDates) return;

        const nextFilters = { ...filters };

        for (const key of ["total", "subtotal"]) {
            const value = nextFilters[key];

            if (
                value !== undefined &&
                (!Number.isFinite(Number(value)) ||
                    Number(value) < 0)
            ) {
                delete nextFilters[key];
            }
        }

        onApply({
            dates: draftDates,
            vendor: isAdmin ? vendor : vendorInput,
            route: isAdmin ? route : routeInput,
            activeFilters: isAdmin ? nextFilters : activeFilters,
        });

        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-2 lg:hidden"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Filter Credit Memos"
                className="flex h-[100dvh] w-full flex-col overflow-hidden sm:rounded-t-2xl bg-gray-100 shadow-2xl sm:max-h-[92dvh] sm:max-w-xl sm:rounded-2xl"
            >
                <header className="flex shrink-0 items-center justify-between bg-(--quarteary) sm:bg-gray-100 p-2">
                    <div className="text-white sm:text-black">
                        <h2 className="text-xl font-bold">
                            Filter Credit Memos
                        </h2>
                        <p className="text-xs opacity-70">
                            Customize your credit memo results
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className="size-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
                    {isAdmin && (
                        <section className="rounded-xl bg-white p-3">
                            <h3 className="mb-2 text-sm font-bold">
                                Date Range
                            </h3>
                            <DateRangePicker
                                fromDate={draftDates.from}
                                toDate={draftDates.to}
                                onChange={(from, to) =>
                                    setDraftDates({ from, to })
                                }
                            />
                        </section>
                    )}

                    {isAdmin && (
                        <section className="space-y-3 rounded-xl bg-white p-3">
                            <h3 className="text-sm font-bold">
                                Assignment Filters
                            </h3>

                            <label className="block">
                                <span className="mb-1 block text-xs text-gray-500">
                                    Vendor
                                </span>
                                <select
                                    value={vendor}
                                    onChange={(event) =>
                                        setVendor(event.target.value)
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map((v: any) => (
                                        <option
                                            key={v._id}
                                            value={v.user?._id ?? ""}
                                        >
                                            {v.code} | {v.user?.firstName}{" "}
                                            {v.user?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-xs text-gray-500">
                                    Driver / Route
                                </span>
                                <select
                                    value={route}
                                    onChange={(event) =>
                                        setRoute(event.target.value)
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">All Routes</option>
                                    {routes.map((r: any) => (
                                        <option key={r._id} value={r._id}>
                                            {r.code} | {r.user?.firstName}{" "}
                                            {r.user?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>
                    )}

                    {isAdmin && (
                        <>
                            <section className="rounded-xl bg-white p-3">
                                <h3 className="mb-2 text-sm font-bold">
                                    Credit Memo Status
                                </h3>

                                <div className="flex flex-wrap gap-2">
                                    {statuses.map((item) => {
                                        const selected =
                                            filters.status === item.value;

                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() =>
                                                    toggleStatus(item.value)
                                                }
                                                className={`min-h-10 rounded-xl px-3 text-xs font-bold ${selected
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-100 text-gray-700"
                                                    }`}
                                            >
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="grid grid-cols-2 gap-3 rounded-xl bg-white p-3">
                                {(["subtotal", "total"] as const).map(
                                    (key) => (
                                        <label key={key} className="min-w-0">
                                            <span className="mb-1 block text-xs font-semibold capitalize text-gray-500">
                                                {key} ($)
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={filters[key] ?? ""}
                                                onChange={(event) =>
                                                    updateAmount(key, event.target.value)
                                                }
                                                placeholder="Any"
                                                className={fieldClass}
                                            />
                                        </label>
                                    )
                                )}
                            </section>
                        </>
                    )}
                </div>

                <footer className="grid shrink-0 grid-cols-2 gap-2 bg-(--quarteary) sm:bg-white p-2 pb-[max(6px,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={clearAll}
                        className="min-h-12 rounded-xl bg-gray-300 text-sm font-bold text-gray-800 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
                    >
                        Clear All
                    </button>

                    <button
                        type="button"
                        disabled={invalidDates}
                        onClick={apply}
                        className="min-h-12 rounded-xl bg-blue-400 text-blue-800 text-sm font-bold hover:bg-blue-800 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        Apply Filters
                    </button>
                </footer>
            </section>
        </div>
    );
}