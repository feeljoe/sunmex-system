"use client";
import { formatCurrency } from "@/utils/format";
import { Icon } from "../ui/Icons";
type Props = {
    creditMemo: any;
    userRole: string;
    selected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onOpen: () => void;
    onAssign: () => void;
    onCancel: () => void;
};

const statusColors: Record<string, string> = {
    pending: "bg-gray-300 text-gray-700",
    received: "bg-green-400 text-green-800",
    cancelled: "bg-red-400 text-red-800",
};

const formatDateTime = (value?: string) =>
    value
        ? new Date(value).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Phoenix",
        })
        : "-";

const fullName = (person?: any) =>
    [person?.firstName, person?.lastName]
        .filter(Boolean)
        .join(" ") || "-";

function Info({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500">
                {label}
            </p>
            <div className="break-words text-xs font-medium text-gray-800 sm:text-sm">
                {children ?? "-"}
            </div>
        </div>
    );
}
export default function CreditMemoMobileCard({
    creditMemo: cm, userRole, selected, onSelect, onOpen, onAssign, onCancel,
}: Props) {
    const isAdmin = userRole === "admin";
    const status = cm.status ?? "pending";

    const canAssign = isAdmin && status === "pending";
    const canCancel = cm.warehouseStatus === "pending" && status !== "cancelled";
    const routePerson = status === "received" ? cm.returnedBy : cm.routeAssigned?.user;
    const routeName = cm.routeAssigned ? `${cm.routeAssigned.code ?? "-"} | ${fullName(routePerson)}` : "-";
    const activity = status === "received" ? {
        personLabel: "Returned By",
        person: fullName(cm.returnedBy),
        dateLabel: "Returned At",
        date: formatDateTime(cm.returnedAt),
    } : status === "cancelled" ? {
        personLabel: "Cancelled By",
        person: fullName(cm.cancelledBy),
        dateLabel: "Cancelled At",
        date: formatDateTime(cm.cancelledAt),
    } : {
        personLabel: "Created By",
        person: fullName(cm.createdBy),
        dateLabel: "Created At",
        date: formatDateTime(cm.createdAt),
    };
    const hasLocation = Number.isFinite(cm.location?.latitude) && Number.isFinite(cm.location?.longitude);
    const mapsUrl = hasLocation
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${cm.location.latitude},${cm.location.longitude}`
        )}`
        : undefined;

    return (
        <article
            className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm ${selected
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                }`}
        >
            <button
                type="button"
                onClick={onOpen}
                className="block w-full cursor-pointer p-2 text-left"
                aria-label={`View credit memo ${cm.number}`}
            >
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black text-gray-900">
                        {cm.number}
                    </h3>

                    <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${statusColors[status] ??
                            "bg-gray-100 text-gray-800"
                            }`}
                    >
                        {status}
                    </span>
                </div>

                <p className="break-words text-base font-bold capitalize text-gray-900">
                    {cm.client?.clientName ?? "Unknown Client"}
                </p>

                <div className="mt-1 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2">
                    <Info label="Subtotal">
                        {formatCurrency(cm.subtotal ?? 0)}
                    </Info>

                    <Info label="Total">
                        <span
                            className={
                                status === "cancelled"
                                    ? "text-red-700"
                                    : status === "received"
                                        ? "text-green-700"
                                        : "text-gray-900"
                            }
                        >
                            {formatCurrency(cm.total ?? 0)}
                        </span>
                    </Info>
                </div>

                {isAdmin && (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                        <Info label={activity.personLabel}>
                            {activity.person}
                        </Info>

                        <Info label={activity.dateLabel}>
                            {activity.date}
                        </Info>
                    </div>
                )}

                {isAdmin && cm.routeAssigned && (
                    <div className="mt-2 rounded-lg bg-blue-50 p-2">
                        <Info label="Assigned Route">
                            {routeName}
                        </Info>
                    </div>
                )}

                {cm.warehouseStatus && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-500">
                            Warehouse:
                        </span>
                        <span
                            className={`rounded-md px-2 py-1 font-bold uppercase ${cm.warehouseStatus === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                        >
                            {cm.warehouseStatus}
                        </span>
                    </div>
                )}

                <div className="mt-2 flex items-center justify-end gap-1 border-t border-gray-100 pt-2 text-xs font-semibold text-blue-700">
                    View Details
                    <Icon name="details" />
                </div>
            </button>

            {(canAssign || canCancel || (isAdmin && hasLocation)) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 p-2">
                    {canAssign && (
                        <>
                            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) =>
                                        onSelect(cm._id, event.target.checked)
                                    }
                                    className="h-5 w-5 accent-blue-600"
                                />
                                Select
                            </label>

                            <button
                                type="button"
                                onClick={onAssign}
                                className="flex min-h-10 items-center gap-1 rounded-lg bg-blue-100 px-3 text-xs font-bold text-blue-800"
                            >
                                <Icon name="assign" />
                                Assign
                            </button>
                        </>
                    )}

                    {isAdmin && mapsUrl && (
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-10 items-center gap-1 rounded-lg bg-green-100 px-3 text-xs font-bold text-green-800"
                        >
                            <Icon name="location" />
                            Location
                        </a>
                    )}

                    {canCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            aria-label={`Cancel credit memo ${cm.number}`}
                            className="flex min-h-10 items-center justify-center rounded-lg bg-red-100 px-3 text-red-800"
                        >
                            <Icon name="cancel" />
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}