"use client";
import { useEffect, useState } from "react";

type Props = {
    product: any;
    orderedQuantity: number;
    currentQuantity: number;
    onClose: () => void;
    onConfirm: (quantity: number) => void;
};

export default function ReceiptQuantityModal({
    product, orderedQuantity, currentQuantity, onClose, onConfirm
}: Props) {
    const [quantity, setQuantity] = useState(String(currentQuantity));

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const parsedQuantity = Number(quantity);
    const isValid = quantity.trim() !== "" && Number.isInteger(parsedQuantity) && parsedQuantity >= 0;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2">
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Change received quantity"
                className="w-full max-w-md rounded-2xl bg-white p-2 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900">
                    Different Quantity?
                </h2>
                <p className="mt-2 text-sm font-semibold capitalize text-gray-700">
                    {product?.brand?.name} {product?.name} {product?.weight ? product.weight : ""}{product?.unit ? product.unit.toUpperCase() : ""}
                </p>
                <p className="mt-3 text-sm text-gray-500">
                    Ordered quantity:{" "}<strong>{orderedQuantity}</strong>
                </p>
                <label className="mt-4 block">
                    <span className="text-sm font-bold text-gray-700">
                        Actual quantity received
                    </span>
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        autoFocus
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border-2 border-blue-300 bg-gray-50 text-center text-2xl font-bold text-gray-900 outline-none focus:border-blue-600"
                    />
                </label>
                {isValid && parsedQuantity === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                        No expiration date will be required because no units were received
                    </p>
                )}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-12 rounded-xl bg-gray-200 font-bold text-gray-800"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!isValid}
                        onClick={() => onConfirm(parsedQuantity)}
                        className="min-h-12 rounded-xl bg-blue-600 font-bold text-white disabled:opacity-40"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}