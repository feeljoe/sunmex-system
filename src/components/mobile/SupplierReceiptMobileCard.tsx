"use client";
import { formatCurrency } from "@/utils/format";
import { CalendarDaysIcon, ChevronRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
type Props = {
    receipt: any;
    onOpen: (receipt: any) => void;
};

const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        timeZone: "America/Phoenix",
    });
};

export default function SupplierReceiptMobileCard({
    receipt, onOpen
}: Props) {
    const status = receipt.paymentStatus ?? "pending";
    const hasPayments = Array.isArray(receipt.payments) && receipt.payments.length > 0;
    const canEdit = ["pending", "overdue"].includes(status) && !hasPayments;
    const statusClasses: Record<string, string> = {
        paid: "bg-green-100 text-green-800",
        pending: "bg-yellow-100 text-yellow-800",
        overdue: "bg-red-100 text-red-800",
    };
    const person = receipt.elaboratedBy;
    const elaboratedBy = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
    return (
        <button
            type="button"
            onClick={() => onOpen(receipt)}
            className="w-full rounded-xl border border-gray-200 bg-white p-2 text-left shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50/30 active:bg-blue-50"
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                        <DocumentTextIcon className="w-4 h-4"/>
                        Supplier Receipt
                    </div>
                    <h3 className="mt-1 break-words text-lg font-black text-gray-900">
                        {receipt.invoice}
                    </h3>
                    <p className="text-xs font-semibold text-blue-700">
                        {receipt.poNumber}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold capitalize ${
                    statusClasses[status] ?? "bg-gray-100 text-gray-700"
                    }`}
                >
                    {status}
                </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold capitalize text-gray-700">
                {receipt.supplier?.name ?? "Unknown Supplier"}
            </p>
            <div className="mt-2 grid grid-cols-2 rounded-lg bg-gray-50 p-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-500">
                        Receipt Total
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                        {formatCurrency(Number(receipt.total ?? 0))}
                    </p>
                </div>
                <div>
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gray-500">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        Received Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                        {formatDate(receipt.receivedAt)}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <div className="min-w-0">
                    <p className="truncate text-xs text-gray-500">
                        {elaboratedBy ? `Received by ${elaboratedBy}` : "Received by -"}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${canEdit ? "text-blue-700" : "text-gray-500"}`}>
                        {canEdit ? "Eligible for editing" : "Receipt Locked"}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-sm font-bold text-blue-700">
                    Details
                    <ChevronRightIcon className="h-5 w-5" />
                </div>
            </div>
        </button>
    );
}