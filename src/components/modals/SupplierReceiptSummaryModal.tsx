"use client";
import { useEffect } from "react";
import { ArrowDownTrayIcon, CalendarDaysIcon, PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { formatCurrency } from "@/utils/format";

interface Props {
  open: boolean;
  receipt: any;
  onClose: () => void;
  onEdit?: (receipt: any) => void;
}
function formatDate(value?: string | Date | null) {
  if(!value) return "-";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "America/Phoenix",
  });
}
function formatExpiration(value?: string | Date | null) {
  if (!value) return "Not Required";

  // Expiration dates represent calendar dates rather
  // than a specific moment in local time.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const iso = date.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

function receiptLots(item: any) {
  if (Array.isArray(item.lots) && item.lots.length > 0) {
    return item.lots;
  }
  if (Number(item.receivedQuantity ?? 0) > 0) {
    return [{
      lotId: item.lotId,
      quantity: Number(item.receivedQuantity),
      expirationDate: item.expirationDate ?? null,
    }];
  }
  return [];
}

function LotSummary({ item }: { item: any }) {
  const lots = receiptLots(item);
  if (lots.length === 0) return <span className="text-gray-500">No units received</span>;
  return (
    <div className="space-y-1">
      {lots.map((lot: any, index: number) => (
        <div key={String(lot.lotId ?? index)} className="flex flex-wrap gap-x-2 text-xs">
          <span className="font-bold">Lot {index + 1}: {lot.quantity} units</span>
          <span>{formatExpiration(lot.expirationDate)}</span>
        </div>
      ))}
    </div>
  );
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
};

export function SupplierReceiptSummaryModal({
  open,
  receipt,
  onClose,
  onEdit,
}: Props) {
  useEffect(() => {
    if(!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !receipt) return null;
  
  const items = [...(receipt.items ?? [])].sort((a, b) => {
    const brandA = String(a.product?.brand?.name ?? "");
    const brandB = String(b.product?.brand?.name ?? "");
    const brandDifference = brandA.localeCompare(brandB);
    if(brandDifference !== 0) return brandDifference;
    return String(a.product?.name ?? "").localeCompare(String(b.product?.name));
  });
  const paymentStatus = receipt.paymentStatus ?? "pending";
  const receiptStatus = receipt.supplierOrder?.status ?? "received";
  const hasPayments = Array.isArray(receipt.payments) && receipt.payments.length > 0;
  const canEdit = ["pending", "overdue"].includes(paymentStatus) && !hasPayments;
  const paidAmount = (receipt.payments ?? []).reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0);
  const balance = Math.max(Number(receipt.total ?? 0) - paidAmount, 0);
  const totalOrdered = items.reduce((sum, item) => sum + Number(item.orderedQuantity ?? 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.receivedQuantity ?? 0), 0);
  const differenceCount = items.filter((item) => Number(item.orderedQuantity) !== Number(item.receivedQuantity) || Math.abs(Number(item.unitCost) - Number(item.actualCost)) >= 0.001).length;
  const person = receipt.elaboratedBy;
  const elaboratedBy = [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "-";


  const exportPdf = () => {
    window.open(`/api/supplierReceipts/${receipt._id}/export/pdf`, "_blank", "noopener,noreferrer");
  };

  const exportExcel = () => {
    window.open(`/api/supplierReceipts/${receipt._id}/export/excel`, "_blank", "noopener,noreferrer");
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(event) => {
        if(event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Supplier Receipt Summary"
        className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-(--secondary) shadow-2xl sm:h-[92dvh] sm:max-w-3xl sm:rounded-2xl lg:max-w-6xl"
      >
        {/* HEADER */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-(--quarteary) sm:bg-(--tertiary) pt-[max(12px,env(safe-area-inset-top))] p-2">
        <div className="min-w-0 text-white sm:text-black">
          <h2 className="text-base font-black sm:text-xl lg:text-2xl">
            Supplier Receipt Summary
          </h2>
          <p className="mt-1 break-words text-xs font-semibold opacity-75">
            {receipt.invoice} | {receipt.poNumber}
          </p>
          </div>
          <button
            type="button"
            aria-label="Close supplier receipt"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <XMarkIcon className="w-6 h-6"/>
          </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-2 sm:p-4">
          {/* RECEIPT INFORMATION */}
          <section className="rounded-xl bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Supplier Invoice
                </p>
                <h3 className="break-words text-xl font-black text-gray-900">
                  {receipt.invoice}
                </h3>
                <p className="mt-1 text-sm font-semibold text-blue-700">
                  PO: {receipt.poNumber}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    paymentStatusColors[paymentStatus] ??
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  Payment: {paymentStatus}
                </span>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold capitalize text-green-800">
                  Order: {receiptStatus}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="font-bold capitalize text-gray-900">
                  {receipt.supplier?.name ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Requested</p>
                <p className="font-bold text-gray-900">
                  {formatDate(receipt.requestedAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Received</p>
                <p className="font-bold text-gray-900">
                  {formatDate(receipt.receivedAt)}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-500">Received By</p>
                <p className="font-bold capitalize text-gray-900">
                  {elaboratedBy}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Paid At</p>
                <p className="font-bold text-gray-900">
                  {formatDate(receipt.paidAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Product Lines</p>
                <p className="font-bold text-gray-900">
                  {items.length}
                </p>
              </div>
            </div>
          </section>

          {/* FINANCIAL SUMMARY */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "Receipt Total",
                value: formatCurrency(Number(receipt.total ?? 0)),
              },
              {
                label: "Paid Amount",
                value: formatCurrency(paidAmount),
              },
              {
                label: "Balance",
                value: formatCurrency(balance),
              },
              {
                label: "Received Units",
                value: `${totalReceived} / ${totalOrdered}`,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase text-gray-500">
                  {metric.label}
                </p>
                <p className="mt-1 break-words text-lg font-black text-gray-900">
                  {metric.value}
                </p>
              </div>
            ))}
          </section>

          {differenceCount > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
              {differenceCount} product line(s) have a quantity
              or unit-cost difference.
            </div>
          )}

          {/* MOBILE / IPAD PRODUCT CARDS */}
          <div className="space-y-2 lg:hidden">
            {items.length === 0 ? (
              <div className="rounded-xl bg-white p-5 text-center text-gray-500">
                No products to show
              </div>
            ) : (
              items.map((item: any, index: number) => {
                const ordered = Number(
                  item.orderedQuantity ?? 0
                );
                const received = Number(
                  item.receivedQuantity ?? 0
                );
                const unitCost = Number(item.unitCost ?? 0);
                const actualCost = Number(
                  item.actualCost ?? 0
                );

                const quantityDifferent = ordered !== received;
                const costDifferent =
                  Math.abs(unitCost - actualCost) >= 0.001;

                return (
                  <article
                    key={item._id ?? index}
                    className={`rounded-xl border p-3 shadow-sm ${
                      quantityDifferent || costDifferent
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase text-blue-700">
                      {item.product?.brand?.name ?? "Unbranded"}
                    </p>

                    <h4 className="mt-1 text-sm font-bold capitalize text-gray-900">
                      {item.product?.name ?? "Unknown Product"} {item.product?.weight ?? ""}{item.product?.unit?.toUpperCase() ?? ""}
                    </h4>

                    <p className="mt-1 break-words text-[11px] text-gray-500">
                      SKU: {item.product?.sku ?? "-"}
                      {" | "}
                      UPC: {item.product?.upc ?? "-"}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/80 p-2">
                      <div>
                        <p className="text-[11px] text-gray-500">
                          Ordered
                        </p>
                        <p className="text-lg font-black text-gray-900">
                          {ordered}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-500">
                          Received
                        </p>
                        <p
                          className={`text-lg font-black ${
                            quantityDifferent
                              ? "text-orange-700"
                              : "text-green-700"
                          }`}
                        >
                          {received}
                          {quantityDifferent && (
                            <span className="ml-1 text-xs">
                              ({received - ordered > 0 ? "+" : ""}
                              {received - ordered})
                            </span>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-500">
                          Original Unit Cost
                        </p>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(unitCost)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-500">
                          Actual Unit Cost
                        </p>
                        <p
                          className={`font-bold ${
                            costDifferent
                              ? "text-orange-700"
                              : "text-gray-900"
                          }`}
                        >
                          {formatCurrency(actualCost)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                      <div>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDaysIcon className="h-4 w-4" />
                          Expiration
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          <LotSummary item={item} />
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Line Total
                        </p>
                        <p className="text-lg font-black text-gray-900">
                          {formatCurrency(
                            received * actualCost
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto rounded-xl bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-(--tertiary)">
                <tr>
                  {[
                    "SKU",
                    "UPC",
                    "Brand",
                    "Product",
                    "Ordered",
                    "Received",
                    "Unit Cost",
                    "Actual Cost",
                    "Expiration",
                    "Total",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap p-3"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map((item: any, index: number) => {
                  const ordered = Number(
                    item.orderedQuantity ?? 0
                  );
                  const received = Number(
                    item.receivedQuantity ?? 0
                  );
                  const originalCost = Number(
                    item.unitCost ?? 0
                  );
                  const actualCost = Number(
                    item.actualCost ?? 0
                  );

                  const quantityDifferent =
                    ordered !== received;
                  const costDifferent =
                    Math.abs(originalCost - actualCost) >= 0.001;

                  return (
                    <tr
                      key={item._id ?? index}
                      className={`border-b border-gray-100 ${
                        quantityDifferent || costDifferent
                          ? "bg-orange-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-2">
                        {item.product?.sku ?? "-"}
                      </td>
                      <td className="p-2">
                        {item.product?.upc ?? "-"}
                      </td>
                      <td className="min-w-40 p-2 font-semibold capitalize">
                        {item.product?.brand?.name?.toLowerCase() ?? "-"}
                      </td>
                      <td className="min-w-40 p-2 font-semibold capitalize">
                        {item.product?.name?.toLowerCase() ?? "-"} {item.product?.weight ?? ""}{item.product?.unit?.toUpperCase() ?? ""}
                      </td>
                      <td className="p-2 text-center">
                        {ordered}
                      </td>
                      <td
                        className={`p-2 text-center font-bold ${
                          quantityDifferent
                            ? "text-orange-700"
                            : ""
                        }`}
                      >
                        {received}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(originalCost)}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          costDifferent
                            ? "font-bold text-orange-700"
                            : ""
                        }`}
                      >
                        {formatCurrency(actualCost)}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        <LotSummary item={item} />
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatCurrency(received * actualCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAYMENTS */}
          <section className="rounded-xl bg-white p-2 shadow-sm">
            <h3 className="font-bold text-gray-900">
              Payment Information
            </h3>

            {!hasPayments ? (
              <p className="mt-2 text-sm text-gray-500">
                No payments recorded.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {receipt.payments.map(
                  (payment: any, index: number) => (
                    <div
                      key={payment._id ?? index}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 text-sm"
                    >
                      <div>
                        <p className="font-bold capitalize">
                          {payment.type ?? "Payment"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.date)}
                        </p>
                        {payment.checkNumber && (
                          <p className="text-xs text-gray-500">
                            Check: {payment.checkNumber}
                          </p>
                        )}
                      </div>

                      <strong>
                        {formatCurrency(Number(payment.amount ?? 0))}
                      </strong>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* EDIT HISTORY */}
          {(receipt.editHistory?.length ?? 0) > 0 && (
            <section className="rounded-xl bg-white p-2 shadow-sm">
              <h3 className="font-bold text-gray-900">
                Correction History
              </h3>

              <div className="mt-2 space-y-2">
                {receipt.editHistory.map(
                  (entry: any, index: number) => (
                    <div
                      key={entry._id ?? index}
                      className="rounded-lg bg-gray-50 p-2 text-sm"
                    >
                      <p className="font-semibold">
                        {formatDate(entry.editedAt)}
                      </p>
                      <p className="mt-1 text-gray-700">
                        {entry.reason ?? "Receipt correction"}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* GRAND TOTAL */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-(--tertiary) p-2">
            <span className="text-lg font-bold">
              Receipt Total
            </span>
            <strong className="text-2xl">
              {formatCurrency(Number(receipt.total ?? 0))}
            </strong>
          </section>
        </div>

        {/* PERSISTENT FOOTER */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-1 py-2 pb-[max(6px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Export to PDF"
              aria-label="Export to PDF"
              onClick={exportPdf}
              className="flex p-2 gap-2 items-center justify-center rounded-xl bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 cursor-pointer transition-colors"
            >
              <ArrowDownTrayIcon className="h-6 w-6" />
              <span className="font-bold">PDF</span>
            </button>

            <button
              type="button"
              title="Export to Excel"
              aria-label="Export to Excel"
              onClick={exportExcel}
              className="flex p-2 gap-2 items-center justify-center rounded-xl bg-green-400 text-green-800 hover:text-white hover:bg-green-800 cursor-pointer transition-colors"
            >
              <ArrowDownTrayIcon className="h-6 w-6" />
              <span className="font-bold">Excel</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(receipt)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <PencilSquareIcon className="h-5 w-5" />
                Edit Receipt
              </button>
            )}

            {!canEdit && (
              <span className="text-xs font-semibold text-gray-500">
                Receipt locked
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}