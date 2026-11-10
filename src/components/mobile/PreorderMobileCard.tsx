"use client";
import { formatCurrency } from "@/utils/format";
import { Icon } from "../ui/Icons";
type Props = {
    preorder: any;
    userRole: string;
    selected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onOpen: () => void;
    onAssign: () => void;
    onCancel: () => void;
};

const statusColors: Record<string, string> = {
    pending: "bg-gray-300 text-gray-700",
    assigned: "bg-yellow-400 text-yellow-800",
    ready: "bg-blue-400 text-blue-800",
    delivered: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
};

const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Phoenix",
    }) : "-";

const fullName = (person?: any) =>
    [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "-";

function Info({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-semibold">
                {label}
            </p>
            <div className="text-xs sm:text-sm font-medium text-gray-800 break-words">
                {children || "-"}
            </div>
        </div>
    );
}
export default function PreorderMobileCard({ preorder: p, userRole, selected, onSelect, onOpen, onAssign, onCancel }: Props) {
    const isAdmin = userRole === "admin";
    const status = p.status ?? "pending";
    const canAssign = isAdmin && p.status !== "cancelled" && p.status !== "delivered";
    const canCancel = p.status !== "cancelled" && p.paymentStatus !== "paid";

    const routePerson = p.status === "delivered" ? p.deliveredBy : p.routeAssigned?.user;
    const routeName = p.routeAssigned ? `${p.routeAssigned?.code ?? ""} ${fullName(routePerson) === "-" ? "" : `| ${fullName(routePerson)}`}` : "-";

    const totalDiffers = p.status === "delivered" && Math.abs(Number(p.subtotal ?? 0) - Number(p.total ?? 0)) >= 0.01;
    const hasLocation = Number.isFinite(p.location?.latitude) && Number.isFinite(p.location?.longitude);
    const mapsUrl = hasLocation
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${p.location.latitude},${p.location.longitude}`
        )}`
        : undefined;

    const getActivityInfo = () => {
        switch(status) {
            case "ready":
                return {
                    personLabel: "Assembled By",
                    person: fullName(p.assembledBy),
                    dateLabel: "AssembledAt",
                    date: formatDateTime(p.assembledAt),
                };
            case "delivered":
                return {
                    personLabel: "Delivered By",
                    person: fullName(p.deliveredBy),
                    dateLabel: "Delivered At",
                    date: formatDateTime(p.deliveredAt),
                };
            case "cancelled":
                return {
                    personLabel: "Cancelled By",
                    person: fullName(p.cancelledBy),
                    dateLabel: "Cancelled At",
                    date: formatDateTime(p.cancelledAt),
                };
            default: 
                return {
                    personLabel: "Created By",
                    person: fullName(p.createdBy),
                    dateLabel: "Created By",
                    date: formatDateTime(p.createdAt),
                };
        }
    };
    const activity = getActivityInfo();
    const showRoute = isAdmin && status !== "pending" && status !== "cancelled";
    const showPayment = status === "delivered";

    return (
        <article className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"}`}>
            <button
                type="button"
                onClick={onOpen}
                className="block w-full cursor-pointer p-2 text-left"
                aria-label={`View Details for preorder ${p.number}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-gray-900">
                            {p.number}
                        </h3>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${statusColors[status] ?? "bg-gray-100 text-gray-800"}`}>
                        {status}
                    </span>
                </div>
                <p className="break-words text-base font-bold capitalize text-gray-900">
                    {p.client?.clientName ?? "Unknown client"}
                </p>
                <div className={`mt-1 grid gap-2 rounded-xl bg-gray-50 p-1 ${p.status === "delivered" ? "grid-cols-3" : "grid-cols-2"}`}>
                    <Info label="Subtotal">
                        {formatCurrency(p.subtotal ?? 0)}
                    </Info>
                    <Info label="Total">
                        <span className={p.status === "cancelled" || totalDiffers ? "text-red-700" : p.status === "delivered" ? "text-green-700" : "text-gray-900"}>
                            {formatCurrency(p.total ?? 0)}
                        </span>
                    </Info>
                    {p.status === "delivered" && (
                        <Info label="Payment">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${p.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                {p.paymentStatus ?? "pending"}
                            </span>
                        </Info>
                    )}
                </div>
                    {isAdmin && (
                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2">
                        <Info label={activity.personLabel}>{activity.person}</Info>
                        <Info label={activity.dateLabel}>{activity.date}</Info>
                        </div>
                    )}
                    {showRoute && (
                        <div className="mt-1 rounded-lg bg-blue-50 px-2 py-1.5">
                            <Info label="Assigned Route">{routeName}</Info>
                        </div>
                    )}
                    <div className="mt-1 flex items-center justify-end gap-1 border-t border-gray-100 pt-2 text-xs font-semibold text-blue-700">
                        View Details
                        <Icon name="details"/>
                    </div>
            </button>

            {(canAssign || canCancel || (isAdmin && hasLocation)) && (
                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 p-2">
                    {canAssign && (
                        <>
                            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => onSelect(p._id, e.target.checked)}
                                    className="h-5 w-5 accent-blue-600"
                                />
                                Select
                            </label>
                            <button
                                type="button"
                                onClick={onAssign}
                                className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-blue-100 px-2 text-xs font-bold text-blue-800 transition-colors hover:bg-blue-200"
                            >
                                <Icon name="assign"/>
                                <span className="hidden min-[400px]:inline">
                                    Assign
                                </span>
                             </button>
                        </>
                    )}
                    {isAdmin && hasLocation && mapsUrl && (
                        <a
                            href={mapsUrl}
                            target="blank"
                            rel="noopener noreferrer"
                            className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-green-100 px-2 text-xs font-bold text-green-800 transition-colors hover:bg-green-200"
                        >
                            <Icon name="location"/>
                            <span className="hidden min-[400px]:inline">
                                Location
                            </span>
                        </a>
                    )}
                    {canCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex min-h-10 items-center justify-center rounded-lg bg-red-100 px-2 text-red-800 transition-colors hover:bg-red-200"
                        >
                            <Icon name="cancel"/>
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}