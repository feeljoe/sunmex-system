"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/format";

export default function DeletePaymentsModal({ order, onClose, onCompleted, onError }: any) {
    const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
    const [confirmMode, setConfirmMode] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const togglePayment = (id: string) => {
        const newSet = new Set(selectedPayments);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPayments(newSet);
    };

    const handleDelete = async () => {
        if (!reason.trim()) return;
        setIsSubmitting(true);

        const deletedIds = Array.from(selectedPayments);

        const res = await fetch("/api/accounting/payments/delete", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order._id,
                orderType: order.type,
                paymentIdsToRemove: deletedIds,
                reason: reason
            })
        });

        setIsSubmitting(false);

        if (res.ok) {
            const totalDeletedAmount = order.payments
                .filter((p: any) => deletedIds.includes(p._id))
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            onCompleted(deletedIds, totalDeletedAmount);
        } else {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.error || "Failed to delete payment(s).";

            onError(errorMessage);
        }
    };

    if (confirmMode) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-[500px] max-w-[95vw]">
                    <h2 className="text-xl font-bold mb-2 text-red-600 text-center">Confirm Deletion</h2>
                    <p className="mb-4 text-center text-gray-700 dark:text-gray-300 font-medium">
                        Are you sure you want to delete <span className="font-bold text-red-500">{selectedPayments.size}</span> payment(s) from invoice <strong>{order.number}</strong>?
                    </p>
                    
                    <div className="bg-(--secondary) p-2 rounded-xl mb-6">
                        <textarea
                            placeholder="Reason for deletion (Required)..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-white border-0 outline-hidden rounded-lg p-3 min-h-[120px] shadow-sm resize-none"
                        />
                    </div>

                    <div className="flex justify-between gap-3">
                        <button 
                            onClick={() => setConfirmMode(false)} 
                            className="px-6 py-2 bg-gray-300 font-bold rounded-xl hover:bg-gray-400 transition-colors cursor-pointer"
                        >
                            Back
                        </button>
                        <button 
                            onClick={handleDelete} 
                            disabled={!reason.trim() || isSubmitting}
                            className="px-6 py-2 bg-red-600 font-bold text-white rounded-xl hover:bg-red-500 disabled:bg-red-300 transition-colors cursor-pointer"
                        >
                            {isSubmitting ? "Deleting..." : "Delete Payments"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-[450px] max-w-[95vw]">
                <h2 className="text-xl font-bold mb-4 border-b pb-2 text-center dark:text-white">Select Payments to Delete</h2>
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mb-4 bg-(--secondary) p-2 rounded-xl">
                    {order.payments.map((p: any) => (
                        <div 
                            key={p._id}
                            onClick={() => togglePayment(p._id)}
                            className={`p-4 border-2 rounded-xl cursor-pointer flex justify-between items-center transition-all duration-200 ${
                                selectedPayments.has(p._id) 
                                ? "border-red-500 bg-red-50 text-red-800" 
                                : "border-transparent bg-white hover:border-gray-300"
                            }`}
                        >
                            <span className="font-semibold">
                                {p.type.toUpperCase()} {p.checkNumber ? `#${p.checkNumber}` : ""}
                            </span>
                            <span className="font-bold">{formatCurrency(p.amount)}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between gap-3 pt-2">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 bg-gray-300 font-bold rounded-xl hover:bg-gray-400 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => setConfirmMode(true)} 
                        disabled={selectedPayments.size === 0}
                        className="px-6 py-2 bg-red-600 font-bold text-white rounded-xl hover:bg-red-500 disabled:bg-gray-400 transition-colors cursor-pointer"
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
    );
}