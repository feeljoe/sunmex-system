"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";
import { generateCreditMemoPDF } from "@/utils/generateCreditMemoPDF";
import { calculateDynamicTotal } from "@/utils/calculatePreorderDynamicTotal";
import { Icon } from "../ui/Icons";

type Props = {
    creditMemo: any;
    userRole: string;
    onClose: () => void;
};

const dateTime = (value?: string) =>
    value
        ? new Date(value).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Phoenix",
        })
        : "-";

const dateOnly = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    const [year, month, day] = d.toISOString().slice(0, 10).split("-");
    return `${month}/${day}/${year}`;
};

const fullName = (person?: any) =>
    [person?.firstName, person?.lastName]
        .filter(Boolean)
        .join(" ") || "-";

const statusColors: Record<string, string> = {
    pending: "bg-gray-200 text-gray-700",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

function Detail({ label, value, }: { label: string; value: React.ReactNode; }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500">
                {label}
            </p>
            <div className="break-words text-sm font-medium text-gray-900">
                {value ?? "-"}
            </div>
        </div>
    );
}
export default function CreditMemoMobileDetailsModal({
    creditMemo: cm, userRole, onClose,
}: Props) {
    const router = useRouter();
    const isAdmin = userRole === "admin";

    const products = useMemo(() => [...(cm.products ?? [])].sort((a, b) => {
        const brandA = a.product?.brand?.name ?? "";
        const brandB = b.product?.brand?.name ?? "";
        const brandDiff = brandA.localeCompare(brandB);
        return brandDiff || String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""));
    }),
        [cm.products]
    );
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);
    const canEdit = isAdmin || cm.status === "pending";

    const location = cm.location;
    const hasLocation =
        Number.isFinite(location?.latitude) &&
        Number.isFinite(location?.longitude);

    const address = cm.client?.billingAddress;

    const totalQty = products.reduce(
        (sum, product) =>
            sum +
            Number(
                cm.status === "received"
                    ? product.pickedQuantity ?? 0
                    : product.quantity ?? 0
            ),
        0
    );

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center sm:p-2"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Credit Memo ${cm.number} details`}
                className="flex h-[100dvh] w-full flex-col overflow-hidden bg-(--secondary) shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:max-w-2xl sm:rounded-2xl"
            >
                <header className="flex shrink-0 items-center justify-between gap-2 bg-(--quarteary) sm:bg-(--tertiary) p-2">
                    <div className="min-w-0 text-white sm:text-black">
                        <p className="text-xs font-semibold opacity-75">
                            Credit Memo Details
                        </p>
                        <h2 className="text-xl font-black">
                            {cm.number}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close details"
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

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
                    <section className="rounded-xl bg-white p-3 shadow-sm">
                        <h3 className="break-words text-lg font-bold capitalize text-gray-900">
                            {cm.client?.clientName ?? "Unknown Client"}
                        </h3>

                        {address && (
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                {[
                                    address.addressLine,
                                    address.city,
                                    address.state,
                                    address.zipCode,
                                    address.country,
                                ].filter(Boolean).join(", ")}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span
                                className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${statusColors[cm.status] ??
                                    "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {cm.status ?? "pending"}
                            </span>

                            <span
                                className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${cm.warehouseStatus === "completed"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                            >
                                Warehouse: {cm.warehouseStatus ?? "pending"}
                            </span>
                        </div>
                    </section>

                    {isAdmin && (
                        <section className="rounded-xl bg-white p-3 shadow-sm">
                            <h3 className="mb-3 font-bold text-gray-900">
                                Credit Memo Information
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <Detail
                                    label="Route"
                                    value={cm.routeAssigned?.code ?? "-"}
                                />
                                <Detail
                                    label="Inventory Location"
                                    value={cm.inventoryLocation ?? "phoenix"}
                                />
                                <Detail
                                    label="Created By"
                                    value={fullName(cm.createdBy)}
                                />
                                <Detail
                                    label="Created At"
                                    value={dateTime(cm.createdAt)}
                                />
                                <Detail
                                    label="Returned By"
                                    value={fullName(cm.returnedBy)}
                                />
                                <Detail
                                    label="Returned At"
                                    value={dateTime(cm.returnedAt)}
                                />
                                <Detail
                                    label="Warehouse Received At"
                                    value={dateTime(cm.warehouseReceivedAt)}
                                />
                                <Detail
                                    label="Cancelled By"
                                    value={fullName(cm.cancelledBy)}
                                />
                            </div>

                            {hasLocation && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        `${location.latitude},${location.longitude}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-100 px-3 text-sm font-bold text-green-800"
                                >
                                    <Icon name="location" />
                                    View Location
                                </a>
                            )}
                        </section>
                    )}

                    {cm.status === "cancelled" && (
                        <section className="rounded-xl border border-red-200 bg-red-50 p-3">
                            <h3 className="font-bold text-red-800">
                                Cancellation Information
                            </h3>
                            <p className="mt-1 text-sm text-red-700">
                                {cm.cancelReason ?? "-"}
                            </p>
                            <p className="mt-2 text-xs text-red-700">
                                {dateTime(cm.cancelledAt)}
                            </p>
                        </section>
                    )}

                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                Products
                            </h3>
                            <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-600">
                                {products.length} lines
                            </span>
                        </div>

                        <div className="space-y-2">
                            {products.map((line: any, index: number) => {
                                const product = line.product ?? {};
                                const ordered = Number(line.quantity ?? 0);
                                const picked = Number(line.pickedQuantity ?? 0);
                                const returned = Number(line.returnedQuantity ?? 0);
                                const verified = line.warehouseVerifiedQuantity;

                                const unitPrice = Number(line.actualCost ?? 0);

                                const activeQty =
                                    cm.status === "received"
                                        ? picked
                                        : ordered;

                                const different =
                                    cm.status === "received" &&
                                    (ordered !== picked || picked !== returned);

                                return (
                                    <article
                                        key={`${product._id ?? index}-${index}`}
                                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${different
                                                ? "border-orange-300"
                                                : "border-gray-200"
                                            }`}
                                    >
                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold uppercase text-blue-700">
                                                        {product.brand?.name ?? "Unknown Brand"}
                                                    </p>

                                                    <h4 className="mt-1 break-words text-sm font-bold capitalize text-gray-900">
                                                        {product.name ?? "Unknown Product"}{" "}
                                                        {product.weight ?? ""}
                                                        {product.unit?.toUpperCase() ?? ""}
                                                    </h4>
                                                </div>

                                                <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                                                    {index + 1}
                                                </span>
                                            </div>

                                            {isAdmin && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <Detail label="SKU" value={product.sku ?? "-"} />
                                                    <Detail label="UPC" value={product.upc ?? "-"} />
                                                </div>
                                            )}

                                            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2 text-center">
                                                <Detail label="Qty" value={ordered} />
                                                <Detail label="Picked" value={picked} />
                                                <Detail label="Returned" value={returned} />
                                            </div>

                                            {verified != null && isAdmin && (
                                                <div className="mt-2 rounded-lg bg-blue-50 p-2">
                                                    <Detail
                                                        label="Warehouse Verified"
                                                        value={verified}
                                                    />
                                                </div>
                                            )}

                                            {different && (
                                                <p className="mt-2 rounded-lg bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                                                    Quantity difference detected
                                                </p>
                                            )}

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span
                                                    className={`rounded-lg px-2 py-1 text-xs font-bold capitalize ${line.returnReason === "credit memo"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-green-100 text-green-800"
                                                        }`}
                                                >
                                                    {line.returnReason ?? "Unknown Reason"}
                                                </span>

                                                {line.condition && (
                                                    <span
                                                        className={`rounded-lg px-2 py-1 text-xs font-bold capitalize ${["damaged", "expired"].includes(line.condition)
                                                                ? "bg-red-100 text-red-800"
                                                                : "bg-green-100 text-green-800"
                                                            }`}
                                                    >
                                                        {line.condition}
                                                    </span>
                                                )}
                                            </div>

                                            {line.expirationDate && (
                                                <p className="mt-2 text-xs text-gray-600">
                                                    Expiration:{" "}
                                                    <span className="font-bold">
                                                        {dateOnly(line.expirationDate)}
                                                    </span>
                                                </p>
                                            )}

                                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
                                                <Detail
                                                    label="Unit Price"
                                                    value={formatCurrency(unitPrice)}
                                                />
                                                <Detail
                                                    label="Line Total"
                                                    value={formatCurrency(activeQty * unitPrice)}
                                                />
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-xl bg-white p-3 shadow-sm">
                        <h3 className="mb-2 font-bold text-gray-900">
                            Credit Memo Summary
                        </h3>

                        <div className="flex justify-between text-sm">
                            <span>Total Units</span>
                            <span className="font-bold">
                                {cm.status === "cancelled" ? "N/A" : totalQty}
                            </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                            <span className="font-bold">
                                {cm.status === "received" ? "Total" : "Subtotal"}
                            </span>
                            <span className="text-xl font-black">
                                {cm.status === "cancelled"
                                    ? "N/A"
                                    : formatCurrency(calculateDynamicTotal(cm))}
                            </span>
                        </div>
                    </section>
                </div>
                <footer className="flex shrink-0 justify-between items-center bg-(--quarteary) sm:bg-white p-2 pb-[max(6px, env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        disabled={!canEdit}
                        onClick={(() => router.push(`/pages/sales/creditmemo/edit/${cm._id}`))}
                        className="flex gap-2 items-center min-h-11 rounded-2xl p-2 bg-yellow-400 font-bold text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => generateCreditMemoPDF(cm)}
                        className="flex gap-2 items-center min-h-11 rounded-2xl p-2 bg-blue-400 font-bold text-blue-800 hover:bg-blue-800 hover:text-white cursor-pointer transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span>PDF</span>
                    </button>
                </footer>
            </section>
        </div>
    );
}