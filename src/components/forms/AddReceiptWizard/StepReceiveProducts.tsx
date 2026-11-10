"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import ReceiptQuantityModal from "@/components/modals/ReceiptQuantityModal";
import { formatCurrency } from "@/utils/format";
import { getReceiptIssues } from "@/utils/receiptValidation";
import ReceiptLotEditor, { type ReceiptLotDraft, createReceiptLot } from "@/components/supplierReceipts/ReceiptLotEditor";

type Props = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  reviewAttempt: number;
};

export default function StepReceiveProducts({
  form,
  setForm,
  reviewAttempt,
}: Props) {
  const [collapsed, setCollapsed] = useState<
    Record<string, boolean>
  >({});

  const [activeQuantityIndex, setActiveQuantityIndex] =
    useState<number | null>(null);


  const items = form.items ?? [];

  const [showErrors, setShowErrors] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const issues = getReceiptIssues(form);
  const invoiceInvalid = issues.some((issue) => issue.field === "invoice");

  const invalidProductIndexes = new Set(issues.filter((issue) => issue.field === "product" && issue.index !== undefined).map((issue) => issue.index as number));

  useEffect(() => {
    if (reviewAttempt === 0) return;
    const currentIssues = getReceiptIssues(form);
    if (currentIssues.length === 0) return;
    setShowErrors(true);
    const brandsToExpand = new Set<string>();
    currentIssues.forEach((issue) => {
      if (issue.field === "product" && issue.index !== undefined) {
        const item = form.items[issue.index];
        const brand = String(item.product?.brand?.name || "Unbranded").toLowerCase();
        brandsToExpand.add(brand);
      }
    });
    setCollapsed((prev) => {
      const updated = { ...prev };
      brandsToExpand.forEach((brand) => {
        updated[brand] = false;
      });
      return updated;
    });
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const target = contentRef.current?.querySelector<HTMLElement>('[data-receipt-invalid="true"]');
        target?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        if (target?.tagName === "INPUT") {
          target.focus({ preventScroll: true });
        }
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [reviewAttempt]);

  const updateItem = (
    index: number,
    updates: Record<string, any>
  ) => {
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  };

  // A product is complete only after being explicitly counted.
  const isResolved = (item: any) => {
    if (!item.counted) return false;

    const quantity = Number(item.receivedQuantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      return false;
    }

    if (quantity === 0) return (item.lots?.length ?? 0) === 0;

    const lots: ReceiptLotDraft[] = item.lots ?? [];

    const totalAllocated = lots.reduce(
      (sum, lot) => sum + Number(lot.quantity || 0),
      0
    );

    return (
      lots.length > 0 &&
      totalAllocated === quantity &&
      lots.every(
        (lot) =>
          lot.quantity !== "" &&
          Number.isInteger(Number(lot.quantity)) &&
          Number(lot.quantity) > 0 &&
          (
            lot.expirationChoice === "notRequired" ||
            (
              lot.expirationChoice === "date" &&
              Boolean(lot.expirationDate)
            )
          )
      )
    );
  };

  const resolvedCount = items.filter(isResolved).length;
  const totalItems = items.length;

  const percentage =
    totalItems === 0
      ? 0
      : Math.round((resolvedCount / totalItems) * 100);

  const totalUnits = items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.receivedQuantity || 0),
    0
  );

  const totalCost = items.reduce(
    (sum: number, item: any) =>
      sum +
      Number(item.receivedQuantity || 0) *
      Number(item.actualCost || 0),
    0
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      { brand: string; items: { item: any; index: number }[] }
    >();

    items.forEach((item: any, index: number) => {
      const brand =
        item.product?.brand?.name?.trim() ||
        "Unbranded";

      const key = brand.toLowerCase();

      if (!groups.has(key)) {
        groups.set(key, { brand, items: [] });
      }

      groups.get(key)!.items.push({ item, index });
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) =>
          String(a.item.product?.name ?? "").localeCompare(
            String(b.item.product?.name ?? "")
          )
        ),
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [items]);

  const progressColor =
    percentage === 100
      ? "bg-green-500"
      : percentage > 75
        ? "bg-yellow-400"
        : percentage > 33
          ? "bg-orange-500"
          : "bg-red-500";


  const markReceived = (index: number) => {
    const item = items[index];

    if (isResolved(item)) {
      updateItem(index, { counted: false });
      return;
    }

    updateItem(index, { counted: true });
  };



  const startExpirationSelection = (
    index: number,
    quantity: number
  ) => {
    const previousItem = items[index];

    const previousLots = previousItem.lots ?? [];

    const lots =
      quantity === 0
        ? []
        : previousLots.length === 1
          ? [
            {
              ...previousLots[0],
              quantity,
            },
          ]
          : previousLots;

    updateItem(index, {
      receivedQuantity: quantity,
      lots:
        lots.length > 0
          ? lots
          : quantity > 0
            ? [createReceiptLot(quantity)]
            : [],
      counted: quantity === 0,
    });
  };

  const confirmQuantity = (quantity: number) => {
    if (activeQuantityIndex === null) return;

    const index = activeQuantityIndex;

    setActiveQuantityIndex(null);
    startExpirationSelection(index, quantity);
  };


  return (
    <div ref={contentRef} className="flex min-h-0 flex-col gap-2">
      {/* PROGRESS */}
      <div className="sticky -top-3 -mx-2 px-2 pt-2 pb-2 z-30 bg-(--secondary)">
        <section className="rounded-xl bg-white px-2 py-1 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="uppercase text-gray-500">
              Receiving Progress
            </span>

            <span
              className={
                percentage === 100
                  ? "text-green-700"
                  : "text-gray-700"
              }
            >
              {resolvedCount} / {totalItems} Counted
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 overflow-hidden rounded-full bg-gray-200"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-2 text-right text-xs text-gray-500">
            {percentage}% Complete
          </p>
        </section>
      </div>
      {/* RECEIPT INFORMATION */}
      <section className="rounded-xl bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {form.poNumber} ·{" "}
            {form.supplier?.name ?? ""}
          </h2>

          <span className="rounded-full bg-blue-200 px-2 py-1 text-xs font-bold text-blue-800">
            {totalItems} Products
          </span>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Supplier Invoice Number *
          </span>

          <input
            type="text"
            required
            data-receipt-invalid={showErrors && invoiceInvalid}
            aria-invalid={showErrors && invoiceInvalid}
            value={form.invoice ?? ""}
            onChange={(e) =>
              setForm((prev: any) => ({
                ...prev,
                invoice: e.target.value,
              }))
            }
            placeholder="Enter invoice number"
            className={`mt-1 h-10 w-full scroll-mt-28 rounded-xl border-2 px-2 text-gray-900 outline-none transition-colors ${showErrors && invoiceInvalid
              ? "border-red-500 bg-red-50 focus:border-red-600"
              : form.invoice?.trim()
                ? "border-green-400 bg-green-50 focus:border-green-600"
                : "border-gray-300 bg-gray-50 focus:border-blue-500"
              }`}
          />
          {showErrors && invoiceInvalid && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              Please enter the supplier invoice number.
            </p>
          )}
          {form.invoice?.trim() && (
            <p className="mt-1 text-xs font-semibold text-green-700">
              Invoice number entered
            </p>
          )}
        </label>
      </section>

      {/* BRAND GROUPS */}
      <div className="">
        {groupedProducts.map((group) => {
          const key = group.brand.toLowerCase();
          const isCollapsed = collapsed[key] ?? false;

          const completed = group.items.filter(({ item }) =>
            isResolved(item)
          ).length;

          return (
            <section
              key={key}
              className="overflow-hidden rounded-xl bg-white shadow-sm"
            >
              {/* COLLAPSIBLE BRAND HEADER */}
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
                className="flex w-full items-center justify-between bg-(--tertiary) p-2 text-left"
              >
                <div className="min-w-0 flex gap-2 items-center">
                  <h3 className="truncate text-base font-black uppercase">
                    {group.brand}
                  </h3>

                  <p className="text-xs font-semibold opacity-70">
                    {completed} / {group.items.length} counted
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {completed === group.items.length && (
                    <span className="rounded-lg bg-green-500 px-2 py-1 text-xs font-bold text-white">
                      Complete
                    </span>
                  )}

                  <span className="text-xl font-bold">
                    {isCollapsed ? "+" : "−"}
                  </span>
                </div>
              </button>

              {!isCollapsed && (
                <div className="space-y-1 p-0.5">
                  {group.items.map(({ item, index }) => {
                    const resolved = isResolved(item);
                    const ordered = Number(
                      item.orderedQuantity
                    );
                    const received = Number(
                      item.receivedQuantity
                    );

                    const qtyDifferent = ordered !== received;
                    const costDifferent =
                      Math.abs(
                        Number(item.actualCost) -
                        Number(item.unitCost)
                      ) >= 0.001;
                    const itemInvalid = invalidProductIndexes.has(index);
                    const showItemError = showErrors && itemInvalid;
                    const validCost = item.actualCost !== "" && item.actualCost != null && Number.isFinite(Number(item.actualCost)) && Number(item.actualCost) >= 0;
                    const validQuantity = item.receivedQuantity !== "" && item.receivedQuantity != null && Number.isInteger(Number(item.receivedQuantity)) && Number(item.receivedQuantity) >= 0;
                    const fullyComplete = resolved && validCost && validQuantity && !itemInvalid;

                    return (
                      <article
                        key={`${item.product?._id ?? index}`}
                        tabIndex={-1}
                        data-receipt-invalid={showItemError}
                        className={`scroll-mt-28 rounded-xl border-2 p-2 outline-none transition-colors ${showItemError
                          ? "border-red-500 bg-red-50"
                          : fullyComplete
                            ? qtyDifferent || costDifferent
                              ? "border-orange-300 bg-orange-50"
                              : "border-green-400 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                          }`}
                      >
                        {/* PRODUCT INFORMATION */}
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={resolved}
                            onChange={() =>
                              markReceived(index)
                            }
                            aria-label={`Count ${item.product?.name}`}
                            className="mt-1 h-6 w-6 shrink-0 cursor-pointer accent-green-600"
                          />

                          <div className="min-w-0 flex-1">
                            <h4 className="break-words text-sm font-bold capitalize text-gray-900 md:text-base">
                              {item.product?.name}
                              {item.product?.weight
                                ? ` ${item.product.weight}${item.product?.unit?.toUpperCase() ?? ""}`
                                : ""}
                            </h4>

                            <p className="break-words text-[11px] text-gray-500">
                              SKU: {item.product?.sku ?? "-"}
                              {" | "}
                              UPC: {item.product?.upc ?? "-"}
                              {" | "}
                              VENDOR-SKU: {item.product?.vendorSku ?? "-"}
                            </p>
                          </div>

                          {resolved && (
                            <span className="rounded-full bg-green-100 px-1.5 py-1 text-[10px] font-bold uppercase text-green-700">
                              Counted
                            </span>
                          )}
                        </div>

                        {/* QUANTITIES */}
                        <div className="mt-2 flex justify-around rounded-xl bg-white p-1">
                          <div className="flex flex-col items-center">
                            <p className="text-[10px] font-semibold uppercase text-gray-500">
                              Ordered
                            </p>
                            <p className="text-lg font-black text-gray-900">
                              {ordered}
                            </p>
                          </div>

                          <div className="flex flex-col items-center">
                            <p className="text-[10px] font-semibold uppercase text-gray-500">
                              Received
                            </p>
                            <p
                              className={`text-lg font-black ${qtyDifferent
                                ? "text-orange-600"
                                : "text-green-600"
                                }`}
                            >
                              {received}
                            </p>
                          </div>
                        </div>

                        {/* COST INPUT */}
                        <div className="mt-2 flex justify-between p-1 items-center">
                          <div className="flex flex-col w-full items-center">
                            <p className="text-[10px] font-semibold uppercase text-gray-500">
                              Original Unit Cost
                            </p>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.unitCost}
                              disabled
                              className={`mt-1 h-10 w-20 rounded-xl border bg-white px-2 font-bold outline-none focus:border-blue-500 ${costDifferent
                                ? "border-orange-400 text-orange-700"
                                : "border-gray-300 text-gray-900"
                                }`}
                            />
                          </div>

                          <label className="flex flex-col w-full text-right items-center">
                            <span className="text-[10px] font-semibold uppercase text-gray-500">
                              Actual Unit Cost
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.actualCost}
                              onChange={(e) =>
                                updateItem(index, {
                                  actualCost:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                })
                              }
                              className={`mt-1 h-10 w-20 rounded-xl border-2 bg-white px-2 text-right font-bold outline-none ${showErrors && !validCost
                                ? "border-red-500 bg-red-50 text-red-800"
                                : validCost
                                  ? costDifferent
                                    ? "border-orange-400 bg-orange-50 text-orange-700"
                                    : "border-green-400 bg-green-50 text-green-800"
                                  : "border-gray-300 text-gray-900"
                                }`}
                            />
                          </label>
                        </div>


                        {/* PRODUCT LOTS */}
                        <ReceiptLotEditor
                          receivedQuantity={received}
                          lots={item.lots ?? []}
                          onChange={(lots) => updateItem(index, {
                            lots, counted: false,
                          })}
                          showErrors={showErrors}
                        />


                        {/* DIFFERENT QUANTITY */}
                        <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveQuantityIndex(index)
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-bold ${showErrors && !validQuantity
                              ? "bg-red-100 text-red-800 ring-2 ring-red-400"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              }`}
                          >
                            Different quantity?
                          </button>

                          <span className="text-xs font-semibold text-gray-600">
                            Line Total:{" "}
                            {formatCurrency(
                              received *
                              Number(item.actualCost || 0)
                            )}
                          </span>
                        </div>

                        {qtyDifferent && resolved && (
                          <p className="mt-2 rounded-lg bg-orange-100 p-2 text-xs font-semibold text-orange-700">
                            Quantity difference:{" "}
                            {received - ordered > 0 ? "+" : ""}
                            {received - ordered} units
                          </p>
                        )}
                        {showItemError && (
                          <div className="mt-2 space-y-1 rounded-xl border border-red-200 bg-white p-2">
                            {issues.filter((issue) => issue.field === "product" && issue.index === index).map((issue, issueIndex) => (
                              <p
                                key={issueIndex}
                                className="text-xs font-semibold text-red-700"
                              >
                                {issue.message}
                              </p>
                            ))}
                          </div>
                        )}
                        {fullyComplete && (
                          <p className="mt-2 text-xs font-bold text-green-700">
                            Product information complete
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* TOTALS */}
      <section className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Total Received Units
          </span>
          <strong>{totalUnits}</strong>
        </div>

        <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-lg">
          <span className="font-bold">
            Receipt Total
          </span>
          <strong>{formatCurrency(totalCost)}</strong>
        </div>
      </section>

      {/* QUANTITY MODAL */}
      {activeQuantityIndex !== null && (
        <ReceiptQuantityModal
          product={items[activeQuantityIndex]?.product}
          orderedQuantity={
            items[activeQuantityIndex]?.orderedQuantity
          }
          currentQuantity={
            items[activeQuantityIndex]?.receivedQuantity
          }
          onClose={() =>
            setActiveQuantityIndex(null)
          }
          onConfirm={confirmQuantity}
        />
      )}

    </div>
  );
}