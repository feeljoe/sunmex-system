"use client";

import { formatCurrency } from "@/utils/format";

type Props = {
    form: any;
};

const formatExpiration = (value?: string) => {
    if (!value) return "Not Required";

    const [year, month, day] = value.slice(0, 10).split("-");
    return `${month}/${day}/${year}`;
};

export default function StepReviewReceipt({
    form
}: Props) {
    const items = [...(form.items ?? [])].sort((a, b) => {
        const brandComparison = String(
            a.product?.brand?.name ?? ""
        ).localeCompare(
            String(b.product?.brand?.name ?? "")
        );

        if (brandComparison !== 0) return brandComparison;

        return String(a.product?.name ?? "").localeCompare(
            String(b.product?.name ?? "")
        );
    });

    const totalOrdered = items.reduce(
        (sum, item) => sum + Number(item.orderedQuantity),
        0
    );

    const totalReceived = items.reduce(
        (sum, item) => sum + Number(item.receivedQuantity),
        0
    );

    const total = items.reduce(
        (sum, item) =>
            sum +
            Number(item.receivedQuantity) *
            Number(item.actualCost),
        0
    );

    const differences = items.filter(
        (item) =>
            Number(item.orderedQuantity) !==
            Number(item.receivedQuantity) ||
            Math.abs(
                Number(item.unitCost) - Number(item.actualCost)
            ) >= 0.001
    );

    return (
        <div className="space-y-4">
            <section className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">
                    Review Supplier Receipt
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    Verify everything before adding these products
                    to inventory.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-gray-500">
                            Purchase Order
                        </p>
                        <p className="font-bold">{form.poNumber}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">
                            Supplier Invoice
                        </p>
                        <p className="break-words font-bold">
                            {form.invoice}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">
                            Supplier
                        </p>
                        <p className="font-bold">
                            {form.supplier?.name ?? "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">
                            Product Lines
                        </p>
                        <p className="font-bold">{items.length}</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xs text-gray-500">
                        Ordered Units
                    </p>
                    <p className="text-2xl font-black">
                        {totalOrdered}
                    </p>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xs text-gray-500">
                        Received Units
                    </p>
                    <p
                        className={`text-2xl font-black ${totalOrdered !== totalReceived
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                    >
                        {totalReceived}
                    </p>
                </div>
            </div>

            {differences.length > 0 ? (
                <div className="rounded-xl border border-orange-300 bg-orange-50 p-3">
                    <p className="font-bold text-orange-800">
                        {differences.length} product line(s) with differences
                    </p>
                    <p className="mt-1 text-xs text-orange-700">
                        Review the highlighted quantities or costs below.
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-800">
                    All received quantities and costs match the purchase order.
                </div>
            )}

            {/* PRODUCT REVIEW */}
            <section className="space-y-2">
                {items.map((item, index) => {
                    const ordered = Number(item.orderedQuantity);
                    const received = Number(item.receivedQuantity);

                    const qtyDifferent = ordered !== received;
                    const costDifferent =
                        Math.abs(
                            Number(item.unitCost) - Number(item.actualCost)
                        ) >= 0.001;

                    return (
                        <article
                            key={`${item.product?._id ?? index}-${index}`}
                            className={`rounded-xl border p-3 shadow-sm ${qtyDifferent || costDifferent
                                    ? "border-orange-300 bg-orange-50"
                                    : "border-green-200 bg-white"
                                }`}
                        >
                            <p className="text-xs font-bold uppercase text-blue-700">
                                {item.product?.brand?.name ?? "-"}
                            </p>

                            <h3 className="mt-1 font-bold capitalize text-gray-900">
                                {item.product?.name?.toLowerCase() ?? "-"} {item.product?.weight ?? ""}{item.product?.unit?.toUpperCase() ?? ""}
                            </h3>
                            <p className="break-words text-[11px] text-gray-500">
                              SKU: {item.product?.sku ?? "-"}
                              {" | "}
                              UPC: {item.product?.upc ?? "-"}
                              {" | "}
                              VENDOR-SKU: {item.product?.vendorSku ?? "-"}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Ordered
                                    </p>
                                    <p className="font-bold">{ordered}</p>
                                </div>

                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Received
                                    </p>
                                    <p
                                        className={`font-bold ${qtyDifferent
                                                ? "text-orange-700"
                                                : "text-green-700"
                                            }`}
                                    >
                                        {received}
                                        {qtyDifferent && (
                                            <span className="ml-1 text-xs">
                                                ({received - ordered > 0 ? "+" : ""}
                                                {received - ordered})
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Original Cost
                                    </p>
                                    <p className="font-bold">
                                        {formatCurrency(item.unitCost)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Actual Cost
                                    </p>
                                    <p
                                        className={`font-bold ${costDifferent
                                                ? "text-orange-700"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        {formatCurrency(item.actualCost)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-2 text-sm">
                                <span className="text-gray-500">
                                    Line Total:{" "}
                                </span>
                                <strong>
                                    {formatCurrency(
                                        received * Number(item.actualCost)
                                    )}
                                </strong>
                            </div>
                            <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                    Inventory Lots
                                </p>

                                {(item.lots ?? []).map((lot: any, index: number) => (
                                    <div
                                        key={lot.clientId ?? index}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs"
                                    >
                                        <span className="font-bold">
                                            Lot {index + 1}: {lot.quantity} units
                                        </span>

                                        <span className="text-gray-600">
                                            {lot.expirationChoice === "notRequired"
                                                ? "Not Required"
                                                : lot.expirationDate
                                                    ? (() => {
                                                        const [year, month, day] =
                                                            lot.expirationDate.split("-");
                                                        return `${month}/${day}/${year}`;
                                                    })()
                                                    : "Missing Date"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </section>

            {/* FINAL TOTAL */}
            <section className="rounded-xl bg-(--tertiary) p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-bold">
                        Receipt Total
                    </span>

                    <span className="text-2xl font-black">
                        {formatCurrency(total)}
                    </span>
                </div>
            </section>

            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                Confirming this receipt will update the Phoenix inventory,
                create lots for received products, and mark the supplier
                order as received. This action should only be performed once.
            </p>
        </div>
    );
}