"use client";

import { formatCurrency } from "@/utils/format";

type Props = {
  original: any;
  draft: any;
  reason: string;
  setReason: (value: string) => void;
};

const getTotal = (items: any[]) =>
  items.reduce(
    (sum, item) =>
      sum +
      Number(item.receivedQuantity || 0) *
        Number(item.actualCost || 0),
    0
  );

  const formatExpiration = (value: any) => {
    if (!value) return "Not Required";
  
    const iso = new Date(value).toISOString().slice(0, 10);
    const [year, month, day] = iso.split("-");
  
    return `${month}/${day}/${year}`;
  };

export default function StepReviewReceiptChanges({
  original,
  draft,
  reason,
  setReason,
}: Props) {
  const originalTotal = Number(original.total ?? 0);
  const newTotal = getTotal(draft.items ?? []);

  const changes = (draft.items ?? []).flatMap(
    (item: any) => {
      const before = (original.items ?? []).find(
        (old: any) =>
          String(old.product?._id ?? old.product) ===
          String(item.product?._id ?? item.product)
      );

      if (!before) return [];

      const differences: string[] = [];

      if (
        Number(before.receivedQuantity) !==
        Number(item.receivedQuantity)
      ) {
        differences.push(
          `Quantity: ${before.receivedQuantity} → ${item.receivedQuantity}`
        );
      }

      if (
        Number(before.actualCost) !==
        Number(item.actualCost)
      ) {
        differences.push(
          `Unit cost: ${formatCurrency(
            Number(before.actualCost)
          )} → ${formatCurrency(Number(item.actualCost))}`
        );
      }

      const originalLots =
        before.lots?.length
          ? before.lots
          : Number(before.receivedQuantity) > 0
            ? [{
                lotId: before.lotId,
                quantity: before.receivedQuantity,
                expirationDate: before.expirationDate,
              }]
            : [];

      const normalizeLots = (lots: any[]) =>
        lots.map((lot) => ({
          lotId: String(lot.lotId ?? ""),
          quantity: Number(lot.quantity),
          expirationDate: lot.expirationDate
            ? String(lot.expirationDate).slice(0, 10)
            : null,
        }));

      const originalNormalized =
        normalizeLots(originalLots);

      const updatedNormalized =
        normalizeLots(item.lots ?? []);

      if (
        JSON.stringify(originalNormalized) !==
        JSON.stringify(updatedNormalized)
      ) {
        differences.push("Inventory lot allocation changed");
      }

      if (!differences.length) return [];

      return [{
        product: item.product?.name ?? "Product",
        differences,
        lots: item.lots ?? [],
      }];
    }
  );

  return (
    <div className="space-y-3">
      <section className="rounded-xl bg-white p-4">
        <h2 className="text-lg font-black text-gray-900">
          Review Receipt Changes
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Verify the corrections before saving.
        </p>
      </section>

      {original.invoice !== draft.invoice && (
        <section className="rounded-xl border border-orange-300 bg-orange-50 p-3">
          <p className="text-xs font-bold text-orange-700">
            Invoice Number
          </p>
          <p className="break-words text-sm">
            {original.invoice} → {draft.invoice}
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-gray-500">
            Original Total
          </p>
          <p className="text-lg font-black">
            {formatCurrency(originalTotal)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-xs text-gray-500">
            Corrected Total
          </p>
          <p className="text-lg font-black text-blue-700">
            {formatCurrency(newTotal)}
          </p>
        </div>
      </div>

      {changes.length === 0 &&
        original.invoice === draft.invoice && (
          <div className="rounded-xl bg-gray-100 p-3 text-sm text-gray-600">
            No changes detected.
          </div>
        )}

      {changes.map((change: any, index: number) => (
        <section
          key={index}
          className="rounded-xl border border-orange-300 bg-orange-50 p-3"
        >
          <h3 className="font-bold capitalize text-gray-900">
            {change.product}
          </h3>

          <div className="mt-2 space-y-1">
            {change.differences.map(
              (description: string) => (
                <p
                  key={description}
                  className="text-sm text-orange-800"
                >
                  {description}
                </p>
              )
            )}
          </div>

          <div className="mt-3 space-y-1">
            {change.lots.map((lot: any, lotIndex: number) => (
              <p
                key={lot.clientId ?? lotIndex}
                className="text-xs text-gray-700"
              >
                Lot {lotIndex + 1}: {lot.quantity} units ·{" "}
                {formatExpiration(lot.expirationDate)}
              </p>
            ))}
          </div>
        </section>
      ))}

      <label className="block rounded-xl bg-white p-3">
        <span className="text-sm font-bold text-gray-900">
          Reason for Correction *
        </span>

        <textarea
          rows={3}
          value={reason}
          onChange={(event) =>
            setReason(event.target.value)
          }
          placeholder="Explain why this supplier receipt needs to be corrected..."
          className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </label>

      <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
        Saving corrections may update inventory quantities,
        lot costs, expiration dates, and the receipt total.
        Changes will be recorded in the receipt history.
      </p>
    </div>
  );
}