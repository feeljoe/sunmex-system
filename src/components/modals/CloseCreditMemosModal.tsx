"use client";
import { useState } from "react";
import { formatCurrency } from "@/utils/format";

type Props = {
    creditMemos: any[];
    onClose: () => void;
    onConfirm: (returnedQuantities: Record<string, number[]>) => Promise<void>;
};

export default function CloseCreditMemosModal({
    creditMemos, onClose, onConfirm,
}: Props) {
    const [expanded, setExpanded] = useState<string[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number[]>>(() =>
        Object.fromEntries(creditMemos.map((memo) => [
            memo._id,
            memo.products.map((p: any) => Number(p.quantity) || 0),
        ])
        )
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const toggleExpanded = (id:string) => {
        setExpanded((prev) => prev.includes(id) ? prev.filter((item) => item !== id): [...prev, id]);
    };

    const updateQuantity = (
        memoId: string,
        productIndex: number,
        value: string,
        originalQuantity: number
    ) => {
        const parsed = value === "" ? 0 : Number(value);
        const safeValue = Number.isFinite(parsed)
            ? Math.min(Math.max(parsed,0), originalQuantity)
            : 0;
        setQuantities((prev) => ({
            ...prev,
            [memoId]: prev[memoId].map((quantity, index) =>
                index === productIndex ? safeValue : quantity), 
        }));
    };

    const handleConfirm = async () => {
        setError("");
        for (const memo of creditMemos) {
            const memoQuantities = quantities[memo._id] ?? [];
            if(memoQuantities.length !== memo.products.length ||
               memoQuantities.some((quantity, index) => !Number.isFinite(quantity) ||
                quantity < 0 ||
                quantity > Number(memo.products[index].quantity))
            ) {
                setError(`Please check the quantities for ${memo.number}.`);
                return;
            }
        }
        setLoading(true);
        try {
            await onConfirm(quantities);
        } catch (err: any) {
            setError(err.message || "Unable to close credit memos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e)=> e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-2">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Close {creditMemos.length} Credit Memo
                            {creditMemos.length === 1 ? "" : "s"}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Review the items and confirm the returned quantities
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl p-2 text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        aria-label="Close Modal">
                            ×
                        </button>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    {creditMemos.map((memo) => {
                        const isExpanded = expanded.includes(memo._id);
                        return (
                            <div key={memo._id} className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 p-2">
                                    <div>
                                        <p className="font-bold text-gray-800">
                                            {memo.number}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {memo.client?.clientName ?? "Client"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Subtotal</p>
                                            <p className="font-bold text-gray-800">{formatCurrency(memo.subtotal ?? 0)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleExpanded(memo._id)}
                                            className="rounded-xl bg-blue-400 p-2 text-blue-800 text-sm font-semibold hover:text-white hover:bg-blue-800 transition-colors">
                                                {isExpanded ? "Hide Items" : "Modify Items"}
                                            </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="overflow-x-auto p-2">
                                        <table className="w-full min-w-[600px] text-left text-sm">
                                            <thead>
                                                <tr className="border-b text-gray-500">
                                                    <th className="p2">Product</th>
                                                    <th className="p2 text-right">Original Qty</th>
                                                    <th className="p2 text-right">Original Price</th>
                                                    <th className="p2 text-right">Returned Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {memo.products.map((product: any, index:number) => (
                                                    <tr key={`${memo._id}-${index}`}
                                                        className="border-b last:border-0">
                                                            <td className="p-2">
                                                                <p className="font-semibold text-gray-800">
                                                                    {product.product?.name ?? "Product"}
                                                                </p>
                                                                {product.product?.sku && (
                                                                    <p className="text-xs text-gray-500">
                                                                        SKU: {product.product.sku}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="p-2">
                                                                {product.quantity}
                                                            </td>
                                                            <td className="p-2">
                                                                {formatCurrency(product.actualCost ?? 0)}
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={Number(product.quantity)}
                                                                    step={1}
                                                                    value={quantities[memo._id]?.[index] ?? 0}
                                                                    onChange={(e)=>
                                                                        updateQuantity(
                                                                            memo._id,
                                                                            index,
                                                                            e.target.value,
                                                                            Number(product.quantity)
                                                                        )
                                                                    }
                                                                    className="w-24 rounded-xl border border-gray-300 p-2 text-right text-gray-800"
                                                                />
                                                            </td>
                                                        </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {error && (
                    <div className="mx-5 rounded-xl bg-red-400 p-2 text-sm text-red-800 hover:text-white hover:bg-red-800 transition-colors">
                        {error}
                    </div>
                )}
                <div className="flex justify-between p-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl bg-gray-300 p-2 text-gray-700 hover:bg-gray-700 hover:text-white font-semibold disabled:opacity-50 transition-colors">
                            Cancel
                        </button>
                        <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || creditMemos.length === 0}
                        className="rounded-xl bg-green-400 p-2 text-green-800 hover:bg-green-800 hover:text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {loading ? "Closing...": "Confirm & Close"}
                        </button>       
                </div>
            </div>
        </div>
    );
}