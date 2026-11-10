"use client";

import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type Props = {
  product: any;
  receivedQuantity: number;
  onNotRequired: () => void;
  onSelectDate: () => void;
  onClose: () => void;
};

export default function ReceiptExpirationConfirmModal({
  product,
  receivedQuantity,
  onNotRequired,
  onSelectDate,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm expiration date"
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">
            Expiration Date
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close expiration confirmation"
            className="rounded-lg bg-red-100 p-2 text-red-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          Does this product require an expiration date?
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="font-bold capitalize text-gray-900">
            {product?.brand?.name} {product?.name}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Received quantity: {receivedQuantity}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onNotRequired}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 p-3 font-bold text-green-800 transition-colors hover:bg-green-100"
          >
            <CheckCircleIcon className="h-8 w-8" />
            Not Required
          </button>

          <button
            type="button"
            onClick={onSelectDate}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 p-3 font-bold text-blue-800 transition-colors hover:bg-blue-100"
          >
            <CalendarDaysIcon className="h-8 w-8" />
            Select Date
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          Choose Not Required only if the product
          does not have an expiration date.
        </p>
      </div>
    </div>
  );
}
