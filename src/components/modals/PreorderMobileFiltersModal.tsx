"use client";
import { useEffect, useState } from "react";
import { DateRangePicker } from "../ui/DateRangePicker";
type Filters = Record<string, string>;
type DateRange = {
    from: string;
    to: string;
};
type Props = {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: {
        dates: DateRange;
        vendor: string;
        route: string;
        warehouse: string;
        activeFilters: Filters;
    }) => void;
    userRole: string;
    apiDates: DateRange;
    vendorInput: string;
    routeInput: string;
    warehouseInput: string;
    activeFilters: Filters;
    vendors: any[];
    routes: any[];
    warehouseUsers: any[];
};

const orderStatuses = [
    { label: "Pending", value: "pending" },
    { label: "Assigned", value: "assigned" },
    { label: "Ready", value: "ready" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
];

const paymentStatuses = [
    { label: "Payment Pending", value: "pending" },
    { label: "Paid", value: "paid" },
];

const selectClass =
    "w-full min-h-11 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-blue-500";

const inputClass =
    "w-full min-h-11 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-blue-500";

export default function PreorderMobileFiltersModal({
    isOpen, onClose, onApply, userRole, apiDates, vendorInput, routeInput, warehouseInput, activeFilters, vendors, routes, warehouseUsers,
}: Props) {
    const [dates, setDates] = useState<DateRange>(apiDates);
    const [vendor, setVendor] = useState(vendorInput);
    const [route, setRoute] = useState(routeInput);
    const [warehouse, setWarehouse] = useState(warehouseInput);
    const [filters, setFilters] = useState<Filters>(activeFilters);

    const isAdmin = userRole === "admin";

    useEffect(() => {
        if (!isOpen) return;
        setDates({ ...apiDates });
        setVendor(vendorInput);
        setRoute(routeInput);
        setWarehouse(warehouseInput);
        setFilters({ ...activeFilters });
    }, [isOpen, apiDates, vendorInput, routeInput, warehouseInput, activeFilters]);
    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    const toggleFilter = (key: string, value: string) => {
        setFilters((prev) => {
            const updated = { ...prev };
            if (updated[key] === value) {
                delete updated[key];
            } else {
                updated[key] = value;
            }
            return updated;
        });
    };
    const updateAmount = (key: string, value: string) => {
        setFilters((prev) => {
            const updated = { ...prev };
            if (value.trim() === "") {
                delete updated[key];
            } else {
                updated[key] = value;
            }
            return updated;
        });
    };
    const clearDraft = () => {
        setVendor("");
        setRoute("");
        setWarehouse("");
        setFilters({});
    };

    const handleApply = () => {
        if (!dates.from || !dates.to) return;
        if (dates.from > dates.to) return;
        const nextFilters = { ...filters };
        for (const key of ["subtotal", "total"]) {
            const value = nextFilters[key];
            if (value === undefined || value.trim() === "" || !Number.isFinite(Number(value))) {
                delete nextFilters[key];
            }
        }
        onApply({
            dates,
            vendor: isAdmin ? vendor : vendorInput,
            route: isAdmin ? route : routeInput,
            warehouse: isAdmin ? warehouse : warehouseInput,
            activeFilters: nextFilters,
        });
        onClose();
    };
    const invalidDates = !dates.from || !dates.to || dates.from > dates.to;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-2 xl:hidden"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Filter Preorders"
                className="flex h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-gray-100 shadow-2xl sm:max-h-[92dvh] sm:max-w-xl sm:rounded-2xl"
            >
                <div className="flex shrink-0 items-center justify-between bg(--tertiary) p-2">
                    <div>
                        <h2 className="text-xl font-bold">
                            Filter Preorders
                        </h2>
                        <p className="text-xs opacity-70">
                            Customize your preorder results
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
                    {isAdmin && (
                        <DateRangePicker
                            fromDate={dates.from}
                            toDate={dates.to}
                            onChange={(from, to) =>
                                setDates({ from, to })
                            }
                        />
                    )}
                    {isAdmin && (
                        <div className="space-y-2 rounded-xl bg-white p-2 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900">
                                Assignment Filters
                            </h3>
                            <label className="block">
                                <span className="mb-1 block text-xs text-gray-500">
                                    Vendor
                                </span>
                                <select
                                    value={vendor}
                                    onChange={(e) => setVendor(e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map((v: any) => (
                                        <option
                                            key={v._id}
                                            value={v.user?._id ?? ""}
                                        >
                                            {v.code} | {v.user?.firstName}{" "}{v.user?.lastName}
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
                                    onChange={(e) => setRoute(e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">All Routes</option>
                                    {routes.map((r: any) => (
                                        <option key={r._id} value={r._id}>
                                            {r.code} | {r.user?.firstName}{" "}{r.user?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs text-gray-500">
                                    Warehouse
                                </span>
                                <select
                                    value={warehouse}
                                    onChange={(e) => setWarehouse(e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">All Warehouse</option>
                                    {warehouseUsers.map((w: any) => (
                                        <option key={w._id} value={w._id}>
                                            {w.firstName} {w.lastName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                        <h3 className="mb-2 text-sm font-bold text-gray-900">
                            Order Status
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {orderStatuses.map((item) => {
                                const selected = filters.status === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleFilter("status", item.value)}
                                        className={`min-h-10 rounded-xl px-2 py-1 text-xs font-bold transition-colors ${selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
                                    >
                                        {item.label}{selected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>                                          
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                        <h3 className="mb-2 text-sm font-bold text-gray-900">
                            Payment Status
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {paymentStatuses.map((item) => {
                                const selected = filters.payment === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleFilter("payment", item.value)}
                                        className={`min-h-10 rounded-xl px-2 py-1 text-xs font-bold transition-colors ${selected ? "bg-blue-600 text-white": "bg-gray-100 text-gray-700"}`}
                                    >
                                        {item.label}{selected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>                                          
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="min-w-0">
                            <span className="mb-1 block text-xs text-gray-500">
                                Subtotal ($)
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                step={0.01}
                                min={0}
                                placeholder="Any"
                                value={filters.subtotal ?? ""}
                                onChange={(e) => updateAmount("subtotal", e.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="min-w-0">
                            <span className="mb-1 block text-xs text-gray-500">
                                Total ($)
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                step={0.01}
                                min={0}
                                placeholder="Any"
                                value={filters.total ?? ""}
                                onChange={(e) => updateAmount("total", e.target.value)}
                                className={inputClass}
                            />
                        </label>
                    </div>
                </div>
                <div className="shrink-0 grid grid-cols-2 gap-2 border border-gray-200 bg-white p-2 pb-[max(12px,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={clearDraft}
                        className="min-h-12 rounded-xl bg-gray-200 text-sm font-bold tex-gray-800"
                    >
                        Clear All
                    </button>
                    <button
                        type="button"
                        disabled={invalidDates}
                        onClick={handleApply}
                        className="min-h-12 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-50"
                    >
                        Apply Filters
                    </button>
                </div>
            </section>
        </div>
    );
}