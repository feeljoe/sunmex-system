
"use client";

import { useEffect, useRef, useState } from "react";
import ReceiptLotEditor, {
    createReceiptLot,
    type ReceiptLotDraft,
} from "@/components/supplierReceipts/ReceiptLotEditor";
import StepReviewReceiptChanges from "@/components/forms/AddReceiptWizard/StepReviewReceiptChanges";
import { formatCurrency } from "@/utils/format";

type Props = {
    open: boolean;
    receipt: any;
    onClose: () => void;
    onSaved: () => void;
};

function toDateInput(value: any): string | null {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString().slice(0, 10);
}

function buildDraft(receipt: any) {
    return {
        invoice: receipt.invoice ?? "",
        items: (receipt.items ?? []).map((item: any) => {
            const quantity = Number(
                item.receivedQuantity ?? 0
            );

            const sourceLots =
                item.lots?.length
                    ? item.lots
                    : quantity > 0
                        ? [{
                            lotId: item.lotId,
                            quantity,
                            expirationDate: item.expirationDate,
                        }]
                        : [];

            const lots: ReceiptLotDraft[] =
                sourceLots.map((lot: any) => {
                    const expirationDate =
                        toDateInput(lot.expirationDate);

                    return {
                        clientId: crypto.randomUUID(),
                        lotId: lot.lotId
                            ? String(lot.lotId)
                            : undefined,
                        quantity: Number(lot.quantity),
                        expirationDate,
                        expirationChoice: expirationDate
                            ? "date"
                            : "notRequired",
                    };
                });

            return {
                product: item.product,
                orderedQuantity: Number(item.orderedQuantity),
                receivedQuantity: quantity,
                unitCost: Number(item.unitCost),
                actualCost: Number(item.actualCost),
                lots,
            };
        }),
    };
}

export default function EditSupplierReceiptModal({
    open,
    receipt,
    onClose,
    onSaved,
}: Props) {
    const [step, setStep] = useState(1);
    const [draft, setDraft] = useState<any>({
        invoice: "",
        items: [],
    });
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || !receipt) return;

        setDraft(buildDraft(receipt));
        setStep(1);
        setReason("");
        setError("");
    }, [open, receipt]);

    useEffect(() => {
        if (open) {
            scrollRef.current?.scrollTo(0, 0);
        }
    }, [step, open]);

    if (!open || !receipt) return null;

    const paymentStatus =
        receipt.paymentStatus ?? "pending";

    const canEdit =
        ["pending", "overdue"].includes(paymentStatus) &&
        (receipt.payments?.length ?? 0) === 0;

    const canEditInventory = canEdit && Number(receipt.inventoryEditVersion ?? 0) === 1;

    const updateItem = (
        index: number,
        updates: Record<string, any>
    ) => {
        setDraft((prev: any) => ({
            ...prev,
            items: prev.items.map((item: any, i: number) =>
                i === index ? { ...item, ...updates } : item
            ),
        }));
    };

    const validate = (): string | null => {
        if (!draft.invoice?.trim()) {
            return "Supplier invoice number is required.";
        }

        for (const item of draft.items) {
            const name = item.product?.name ?? "Product";
            const qty = Number(item.receivedQuantity);
            const cost = Number(item.actualCost);

            if (
                item.receivedQuantity === "" ||
                !Number.isInteger(qty) ||
                qty < 0
            ) {
                return `${name}: invalid received quantity.`;
            }

            if (
                item.actualCost === "" ||
                !Number.isFinite(cost) ||
                cost < 0
            ) {
                return `${name}: invalid actual cost.`;
            }

            if (qty === 0) {
                if ((item.lots?.length ?? 0) > 0) {
                    return `${name}: remove lots when no units were received.`;
                }

                continue;
            }

            const lots: ReceiptLotDraft[] = item.lots ?? [];

            const allocated = lots.reduce(
                (sum, lot) => sum + Number(lot.quantity || 0),
                0
            );

            if (allocated !== qty || lots.length === 0) {
                return `${name}: lot quantities must total ${qty}.`;
            }

            for (const lot of lots) {
                if (
                    lot.quantity === "" ||
                    !Number.isInteger(Number(lot.quantity)) ||
                    Number(lot.quantity) <= 0
                ) {
                    return `${name}: invalid lot quantity.`;
                }

                if (lot.expirationChoice === "notRequired") {
                    if (lot.expirationDate) return `${name}: non-expiring lot must not have an expiration date.`;
                    continue;
                }
                if (lot.expirationChoice !== "date" || !lot.expirationDate) {
                    return `${name}: complete all lot expiration decisions.`;
                }
                const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lot.expirationDate);
                if (!match) return `${name}: expiration date must be YYYY-MM-DD.`;
                const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
                const parsed = new Date(Date.UTC(y, m - 1, d, 12));
                if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
                    return `${name}: invalid expiration date.`;
                }
            }
        }

        return null;
    };

    const reviewChanges = () => {
        const validationError = validate();

        if (validationError) {
            setError(validationError);
            return;
        }

        setError("");
        setStep(2);
    };

    // Integration gate: the current PATCH still expects a single lot per product.
    // Keep the editor in preview mode until the new multi-lot transactional PATCH is installed.
    const multiLotPatchReady = false;

    const submitChanges = async () => {
        if (!multiLotPatchReady) {
            setError("Saving is unavailable until the multi-lot inventory reconciliation API is deployed.");
            return;
        }
        if (saving || !canEdit) return;

        const validationError = validate();

        if (validationError) {
            setError(validationError);
            setStep(1);
            return;
        }

        if (!reason.trim()) {
            setError("Please enter a correction reason.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const payload = {
                invoice: draft.invoice.trim(),
                expectedUpdatedAt: receipt.updatedAt,
                reason: reason.trim(),
                items: draft.items.map((item: any) => ({
                    product:
                        item.product?._id ?? item.product,
                    receivedQuantity:
                        Number(item.receivedQuantity),
                    actualCost:
                        Number(item.actualCost),
                    lots: item.lots.map(
                        (lot: ReceiptLotDraft) => ({
                            ...(lot.lotId
                                ? { lotId: lot.lotId }
                                : {}),
                            quantity: Number(lot.quantity),
                            expirationDate:
                                lot.expirationChoice === "date"
                                    ? lot.expirationDate
                                    : null,
                        })
                    ),
                })),
            };

            const response = await fetch(
                `/api/supplierReceipts/${receipt._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ??
                    "Failed to update supplier receipt."
                );
            }

            onSaved();
        } catch (err: any) {
            setError(
                err.message ?? "Failed to update receipt."
            );
        } finally {
            setSaving(false);
        }
    };

    const total = draft.items.reduce(
        (sum: number, item: any) =>
            sum +
            Number(item.receivedQuantity || 0) *
            Number(item.actualCost || 0),
        0
    );

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-0 sm:p-3">
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Edit supplier receipt"
                className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-(--secondary) shadow-2xl sm:h-[92dvh] sm:rounded-2xl"
            >
                {/* HEADER */}
                <header className="shrink-0 bg-(--tertiary) p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black">
                                Edit Supplier Receipt
                            </h2>
                            <p className="text-xs opacity-75">
                                {receipt.poNumber}
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="rounded-lg bg-red-500 px-3 py-2 font-bold text-white disabled:opacity-50"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {["Edit Receipt", "Review Changes"].map(
                            (label, index) => (
                                <div
                                    key={label}
                                    className={`rounded-lg p-2 text-center text-xs font-bold ${step === index + 1
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/70 text-gray-700"
                                        }`}
                                >
                                    {index + 1}. {label}
                                </div>
                            )
                        )}
                    </div>
                </header>

                {/* SCROLLABLE CONTENT */}
                <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
                >
                    {!canEdit && (
                        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">
                            This receipt has payment activity or is paid
                            and can no longer be edited.
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <>
                            <section className="rounded-xl bg-white p-3">
                                <label className="block">
                                    <span className="text-sm font-bold text-gray-800">
                                        Supplier Invoice Number
                                    </span>
                                    <input
                                        value={draft.invoice}
                                        disabled={!canEdit}
                                        onChange={(event) =>
                                            setDraft((prev: any) => ({
                                                ...prev,
                                                invoice: event.target.value,
                                            }))
                                        }
                                        className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-gray-900 disabled:opacity-50"
                                    />
                                </label>
                            </section>

                            {canEdit && !canEditInventory && (
                                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                                    This is a historical supplier receipt. You can
                                    correct its invoice number, but inventory changes
                                    require verified lot history.
                                </div>
                            )}

                            {draft.items.map((item: any, index: number) => (
                                <section
                                    key={item.product?._id ?? index}
                                    className="space-y-2 rounded-xl bg-white p-3 shadow-sm"
                                >
                                    <div>
                                        <p className="text-xs font-bold uppercase text-blue-700">
                                            {item.product?.brand?.name ??
                                                "Unbranded"}
                                        </p>
                                        <h3 className="font-bold capitalize text-gray-900">
                                            {item.product?.name?.toLowerCase() ?? ""} {item.product?.weight ?? ""}{item.product?.unit?.toUpperCase() ?? ""}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            SKU: {item.product?.sku ?? "-"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            UPC: {item.product?.upc ?? "-"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            VENDOR-SKU: {item.product?.vendorSku ?? "-"}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Ordered
                                            </p>
                                            <p className="font-black">
                                                {item.orderedQuantity}
                                            </p>
                                        </div>

                                        <label>
                                            <span className="text-xs text-gray-500">
                                                Received
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                disabled={!canEditInventory}
                                                value={item.receivedQuantity}
                                                onChange={(event) => {
                                                    const qty =
                                                        event.target.value === ""
                                                            ? ""
                                                            : Number(event.target.value);

                                                    updateItem(index, {
                                                        receivedQuantity: qty,
                                                        lots:
                                                            qty === 0
                                                                ? []
                                                                : Number(qty) > 0 && (item.lots?.length ?? 0) === 0
                                                                    ? [createReceiptLot(Number(qty))]
                                                                    : item.lots,
                                                    });
                                                }}
                                                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm font-bold text-gray-900 disabled:opacity-50"
                                            />
                                        </label>

                                        <label>
                                            <span className="text-xs text-gray-500">
                                                Actual Cost
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                disabled={!canEditInventory}
                                                value={item.actualCost}
                                                onChange={(event) =>
                                                    updateItem(index, {
                                                        actualCost:
                                                            event.target.value === ""
                                                                ? ""
                                                                : Number(event.target.value),
                                                    })
                                                }
                                                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm font-bold text-gray-900 disabled:opacity-50"
                                            />
                                        </label>
                                    </div>

                                    <ReceiptLotEditor
                                        receivedQuantity={
                                            Number(item.receivedQuantity || 0)
                                        }
                                        lots={item.lots}
                                        disabled={!canEditInventory}
                                        onChange={(lots: any) =>
                                            updateItem(index, { lots })
                                        }
                                    />
                                </section>
                            ))}

                            <section className="flex items-center justify-between rounded-xl bg-(--tertiary) p-4">
                                <strong>Corrected Total</strong>
                                <strong className="text-xl">
                                    {formatCurrency(total)}
                                </strong>
                            </section>
                        </>
                    ) : (
                        <StepReviewReceiptChanges
                            original={receipt}
                            draft={draft}
                            reason={reason}
                            setReason={setReason}
                        />
                    )}
                </div>

                {/* PERSISTENT FOOTER */}
                <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={
                            step === 1
                                ? onClose
                                : () => {
                                    setError("");
                                    setStep(1);
                                }
                        }
                        className="min-h-11 rounded-xl bg-gray-200 px-4 text-sm font-bold text-gray-800 disabled:opacity-50"
                    >
                        {step === 1 ? "Cancel" : "Back to Edit"}
                    </button>

                    <button
                        type="button"
                        disabled={saving || !canEdit || (step === 2 && !multiLotPatchReady)}
                        onClick={
                            step === 1
                                ? reviewChanges
                                : submitChanges
                        }
                        className="min-h-11 rounded-xl bg-green-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {step === 2 && !multiLotPatchReady
                            ? "Awaiting Safe Edit API"
                            : saving
                                ? "Saving..."
                                : step === 1
                                    ? "Review Changes"
                                    : "Save Corrections"}
                    </button>
                </footer>
            </div>
        </div>
    );
}