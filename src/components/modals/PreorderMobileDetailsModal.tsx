"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";
import { calculateDynamicTotal } from "@/utils/calculatePreorderDynamicTotal";
import { generatePreorderPDF } from "@/utils/generatePreorderPDF";
import { Icon } from "../ui/Icons";

type Props = {
    preorder: any;
    userRole: string;
    onClose: () => void;
    onEdit: (preorder: any) => void;
};

const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Phoenix",
    }) : "-";

const fullName = (p?: any) => [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "-";
const statusColors: Record<string, string> = {
    pending: "bg-gray-300 text-gray-700",
    assigned: "bg-yellow-400 text-yellow-800",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
};
function Detail({ label, value }: { label: string; value: React.ReactNode; }) {
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

export default function PreorderMobileDetailsModal({
    preorder, userRole, onClose,
}: Props) {
    const router = useRouter();
    const isAdmin = userRole === "admin";
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    const products = useMemo(() =>
        [...(preorder.products ?? [])].sort((a, b) => {
            const brandA = a.productInventory?.product?.brand?.name ?? "";
            const brandB = b.productInventory?.product?.brand?.name ?? "";
            const brandComparison = brandA.localeCompare(brandB);
            if (brandComparison) return brandComparison;
            return (a.productInventory?.product?.name ?? "").localeCompare(b.productInventory?.product?.name ?? "");
        }),
        [preorder.products]);

    const totalQty = products.reduce((sum, p) => {
        const qty = preorder.status === "delivered"
            ? p.deliveredQuantity ?? 0
            : preorder.status === "ready"
                ? p.pickedQuantity ?? 0
                : p.quantity ?? 0;
        return sum + qty;
    }, 0);
    const canEdit = preorder.paymentStatus !== "paid" && preorder.status !== "cancelled";
    const address = preorder.client?.billingAddress;
    const location = preorder.location;
    const hasLocation = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
    const routePerson = preorder.status === "delivered"
        ? preorder.deliveredBy : preorder.routeAssigned?.user;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-2"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Preorder ${preorder.number} details`}
                className="flex h-[100dvh] w-full flex-col overflow-hidden bg-(--secondary) shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:max-w-2xl sm:rounded-2xl"
            >
                <header className="flex shrink-0 items-center justify-between gap-2 bg-(--quarteary) sm:bg-(--tertiary) p-2">
                    <div className="min-w-0 text-white sm:text-black">
                        <p className="text-xs font-semibold opacity-70">
                            Preorder Details
                        </p>
                        <h2 className="text-xl font-black">
                            #{preorder.number}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close details"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-xl font-bold text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-1">
                    <section className="rounded-xl bg-white p-2 shadow-sm">
                        <h3 className="break-words text-lg font-bold capitalize text-gray-900">
                            {preorder.client?.clientName ?? "-"}
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
                            <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${statusColors[preorder.status] ?? "bg-gray-100"}`}>
                                {preorder.status}
                            </span>
                            {preorder.type !== "noCharge" ? (
                                <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${preorder.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                    Payment: {preorder.paymentStatus ?? "pending"}
                                </span>
                            ): (
                                <></>
                            )}
                            {isAdmin && (
                                <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${preorder.type === "noCharge" ? "bg-red-200 text-red-700" : "bg-gray-200 text-gray-700"}`}>
                                    {preorder.type === "noCharge" ? "NO CHARGE" : preorder.type ?? "-"}
                                </span>
                            )}
                        </div>
                    </section>
                    {isAdmin && (
                        <section className="rounded-xl bg-white p-2 shadow-sm">
                            <h3 className="mb-2 font-bold text-gray-800">
                                Order Information
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Detail label="Route" value={preorder.routeAssigned?.code ?? "-"} />
                                <Detail label="Driver" value={fullName(routePerson)} />
                                <Detail label="Created By" value={fullName(preorder.createdBy)} />
                                <Detail label="Created At" value={formatDateTime(preorder.createdAt)} />
                                <Detail label="Assembled By" value={fullName(preorder.assembledBy)} />
                                <Detail label="Assembled At" value={formatDateTime(preorder.assembledAt)} />
                                <Detail label="Delivered At" value={formatDateTime(preorder.deliveredAt)} />
                                <Detail label="Inventory Location" value={preorder.inventoryLocation ?? "Phoenix"} />
                            </div>
                            {hasLocation && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        `${location.latitude},${location.longitude}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-green-100 px-2 mt-2 font-bold text-green-800 transition-colors hover:bg-green-200"
                                >
                                    <Icon name="location"/>
                                    <span className="hidden min-[400px]:inline">
                                        Location
                                    </span>

                                </a>
                            )}
                        </section>
                    )}
                    {preorder.status === "cancelled" && (
                        <section className="rounded-xl border border-red-200 bg-red-50 p-2">
                            <h3 className="font-bold text-red-800">
                                Cancellation Information
                            </h3>
                            <p className="mt-2 break-words text-sm text-red-700">
                                Reason: {preorder.cancelReason ?? "-"}
                            </p>
                            {isAdmin && (
                                <div className="mt-2 grid grid-cols-2 gap-3">
                                    <Detail label="Cancelled By" value={fullName(preorder.cancelledBy)} />
                                    <Detail label="Cancelled At" value={formatDateTime(preorder.cancelledAt)} />
                                </div>
                            )}
                        </section>
                    )}
                    <section>
                        <div className="mb-2 flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-gray-900">
                                Products
                            </h3>
                            <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-600">
                                {products.length} lines
                            </span>
                        </div>
                        <div className="space-y-2">
                            {products.map((p: any, index: number) => {
                                const product = p.productInventory?.product;
                                const ordered = p.quantity ?? 0;
                                const picked = p.pickedQuantity ?? 0;
                                const delivered = p.deliveredQuantity ?? 0;
                                const unitPrice = p.effectiveUnitPrice ?? p.actualCost ?? p.unitPrice ?? 0;
                                const activeQty = preorder.status === "delivered" ? delivered : preorder.status === "ready" ? picked : ordered;
                                const isDifferent = (preorder.status === "ready" && picked !== ordered) || (preorder.status === "delivered" && (delivered !== picked || delivered !== ordered));
                                return (
                                    <article
                                        key={`${p.productInventory?._id ?? index}-${index}`}
                                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isDifferent ? "border-orange-300" : "border-gray-200"}`}
                                    >
                                        <div className="p-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold uppercase text-blue-700">
                                                        {product?.brand?.name ?? "Unknown Brand"}
                                                    </p>
                                                    <h4 className="mt-1 break-words text-sm font-bold capitalize text-gray-900">
                                                        {product?.name ?? "Unknown Product"}{" "}
                                                        {product?.weight ?? ""}
                                                        {product?.unit?.toUpperCase() ?? ""}
                                                    </h4>
                                                </div>
                                                <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            {isAdmin && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <Detail label="SKU" value={product?.sku ?? "-"} />
                                                    <Detail label="UPC" value={product?.upc ?? "-"} />
                                                </div>
                                            )}
                                            {isAdmin ? (
                                                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-50 p-2 text-center">
                                                    <div>
                                                        <p className="text-[10px] text-gray-500">
                                                            Ordered
                                                        </p>
                                                        <p className="text-base font-black text-gray-900">
                                                            {Math.round(ordered)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500">
                                                            Picked
                                                        </p>
                                                        <p className={`text-base font-black ${picked === 0 ? "text-red-600" : picked !== ordered ? "text-orange-600" : "text-green-600"}`}>
                                                            {Math.round(picked)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500">
                                                            Delivered
                                                        </p>
                                                        <p className={`text-base font-black ${delivered === 0 ? "text-red-600" : delivered < picked ? "text-orange-600" : "text-green-600"}`}>
                                                            {Math.round(delivered)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-2 rounded-lg bg-gray-50 p-2 text-center">
                                                    <p className="text-[11px] text-gray-500">
                                                        Quantity
                                                    </p>
                                                    <p className="text-lg font-black text-gray-900">
                                                        {Math.round(ordered)}
                                                    </p>
                                                </div>
                                            )}
                                            {isDifferent && (
                                                <p className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                                                    Quantity difference detected
                                                </p>
                                            )}
                                            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-500">
                                                        Unit Price
                                                    </p>
                                                    <p className="text-sm font-semibold text-gray-700">
                                                        {formatCurrency(unitPrice)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-500">
                                                        Line Total
                                                    </p>
                                                    <p className="text-base font-black text-gray-900">
                                                        {formatCurrency(activeQty * unitPrice)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                            {products.length === 0 && (
                                <p className="rounded-xl bg-white p-2 text-center text-sm text-gray-500">
                                    No products found.
                                </p>
                            )}
                        </div>
                    </section>
                    <section className="rounded-xl bg-white p-2 shadow-sm">
                        <h3 className="mb-2 font-bold text-gray-900">
                            Order Summary
                        </h3>
                        <div className="flex justify-between gap-2 text-sm">
                            <span className="text-gray-600">Total Units</span>
                            <span className="font-bold">{preorder.status === "cancelled" ? "N/A" : totalQty}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-2 border-t border-gray-200 pt-3">
                            <span className="font-bold text-gray-700">
                                {preorder.status === "delivered" ? "Total" : "Subtotal"}
                            </span>
                        </div>
                        <div className="text-xl font-black text-gray-900">
                            {preorder.status === "cancelled" ? "N/A" : formatCurrency(calculateDynamicTotal(preorder))}
                        </div>
                    </section>
                </div>
                <footer className="flex shrink-0 justify-between items-center bg-(--quarteary) sm:bg-white p-2 pb-[max(6px,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        disabled={!canEdit}
                        onClick={(() => router.push(`/pages/sales/preorders/edit/${preorder._id}`))}
                        className="flex gap-2 items-center min-h-11 rounded-2xl p-2 bg-yellow-400 font-bold text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => generatePreorderPDF(preorder)}
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