"use client";

import { useState } from "react";

export default function DifferenceReasonModal({
    product,
    onConfirm,
    onClose,
}: {
    product: any;
    onConfirm: (data: {quantity: number; reason: string }) => void;
    onClose: () => void;
}) {
    const [qty, setQty] = useState(product.pickedQuantity);
    const [reason, setReason] = useState("");

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-xl font-semibold">
                Short Pick Reason
                </h3>

                <div>
                <label className="block text-sm font-medium">
                    Actual Quantity Available
                </label>
                <input
                    type="number"
                    min={0}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full border rounded-lg p-2"
                />
                </div>

                <div>
                <label className="block text-sm font-medium">
                    Reason
                </label>
                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border rounded-lg p-2"
                >
                    <option value="">Select reason</option>
                    <option value="productDamaged">Product damaged</option>
                    <option value="productExpired">Product expired</option>
                    <option value="productNotAvailable">Product not available</option>
                </select>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose}>Cancel</button>
                    <button
                        disabled={!reason}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                        onClick={() => onConfirm({ quantity: qty, reason })}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}