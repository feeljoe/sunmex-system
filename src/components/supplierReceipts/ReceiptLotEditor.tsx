"use client";

import { useState } from "react";
import { SingleDatePicker } from "@/components/ui/SingleDatePicker";

export type ReceiptLotDraft = {
  clientId: string;
  lotId?: string;
  quantity: number | "";
  expirationDate: string | null;
  expirationChoice: "unselected" | "notRequired" | "date";
};

type Props = {
  receivedQuantity: number;
  lots: ReceiptLotDraft[];
  onChange: (lots: ReceiptLotDraft[]) => void;
  showErrors?: boolean;
  disabled?: boolean;
};

export const createReceiptLot = (quantity: number | "" = ""): ReceiptLotDraft => ({
  clientId: crypto.randomUUID(),
  quantity,
  expirationDate: null,
  expirationChoice: "unselected",
});

const validISODate = (value: string | null) => {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export default function ReceiptLotEditor({
  receivedQuantity, lots, onChange, showErrors = false, disabled = false,
}: Props) {
  const [splitTarget, setSplitTarget] = useState<string | null>(null);
  const [splitQuantity, setSplitQuantity] = useState("");
  const allocated = lots.reduce((sum, lot) => sum + (lot.quantity === "" ? 0 : Number(lot.quantity)), 0);
  const remaining = receivedQuantity - allocated;

  const validLot = (lot: ReceiptLotDraft) =>
    lot.quantity !== "" &&
    Number.isInteger(Number(lot.quantity)) && Number(lot.quantity) > 0 &&
    (lot.expirationChoice === "notRequired" && !lot.expirationDate ||
      lot.expirationChoice === "date" && validISODate(lot.expirationDate));

  const validAll = receivedQuantity > 0 && remaining === 0 && lots.length > 0 && lots.every(validLot);

  const updateLot = (clientId: string, changes: Partial<ReceiptLotDraft>) => {
    if (disabled) return;
    onChange(lots.map(lot => lot.clientId === clientId ? { ...lot, ...changes } : lot));
  };

  const removeLot = (clientId: string) => {
    if (disabled) return;
    onChange(lots.filter(lot => lot.clientId !== clientId));
    setSplitTarget(null);
    setSplitQuantity("");
  };

  const completeSplit = (lot: ReceiptLotDraft) => {
    const amount = Number(splitQuantity);
    const original = Number(lot.quantity);
    if (disabled || !Number.isInteger(amount) || amount <= 0 || amount >= original) return;
    const newLot = createReceiptLot(amount);
    // Existing lot keeps its identity; the newly split lot gets a new identity on POST/PATCH.
    onChange(lots.flatMap(current => current.clientId === lot.clientId
      ? [{ ...current, quantity: original - amount }, newLot] : [current]));
    setSplitQuantity("");
    setSplitTarget(null);
  };

  if (receivedQuantity === 0) {
    return <div className="rounded-lg bg-gray-100 p-3 text-xs font-semibold text-gray-600">No inventory lots required because zero units were received.</div>;
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-black text-gray-900">Inventory Lots</h4>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${remaining === 0 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
          {allocated} / {receivedQuantity} allocated
        </span>
      </div>
      {lots.map((lot, index) => {
        const valid = validLot(lot);
        const quantity = lot.quantity === "" ? 0 : Number(lot.quantity);
        return (
          <div key={lot.clientId} className={`space-y-3 rounded-xl border-2 p-3 ${showErrors && !valid ? "border-red-400 bg-red-50" : valid ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-800">Lot {index + 1}</span>
              <div className="flex gap-2">
                {quantity >= 2 && !disabled && <button type="button" onClick={() => { setSplitTarget(lot.clientId); setSplitQuantity(""); }} className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">Split this lot</button>}
                {lots.length > 1 && !disabled && <button type="button" onClick={() => removeLot(lot.clientId)} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Remove</button>}
              </div>
            </div>
            {splitTarget === lot.clientId && !disabled && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <label className="block text-xs font-bold text-blue-900">Units to move into the new lot (1 to {quantity - 1})
                  <input type="number" min={1} max={quantity - 1} step={1} inputMode="numeric" value={splitQuantity} onChange={e => setSplitQuantity(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-blue-300 bg-white px-3 text-gray-900" />
                </label>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { setSplitTarget(null); setSplitQuantity(""); }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold">Cancel</button>
                  <button type="button" onClick={() => completeSplit(lot)} disabled={!Number.isInteger(Number(splitQuantity)) || Number(splitQuantity) <= 0 || Number(splitQuantity) >= quantity || splitQuantity.trim() === ""} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Split Lot</button>
                </div>
              </div>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Quantity in this lot</span>
              <input type="number" min={1} step={1} inputMode="numeric" disabled={disabled} value={lot.quantity} onChange={e => updateLot(lot.clientId, {quantity: e.target.value === "" ? "" : Number(e.target.value)})} className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 font-bold text-gray-900 outline-none focus:border-blue-500 disabled:opacity-50" />
            </label>
            <p className="text-xs font-semibold text-gray-700">Expiration</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => updateLot(lot.clientId, {expirationChoice: "notRequired", expirationDate: null})} className={`min-h-11 rounded-lg border p-2 text-xs font-bold disabled:opacity-50 ${lot.expirationChoice === "notRequired" ? "border-green-500 bg-green-100 text-green-800" : "border-gray-300 bg-white text-gray-700"}`}>Not Required</button>
              <button type="button" disabled={disabled} onClick={() => updateLot(lot.clientId, {expirationChoice: "date"})} className={`min-h-11 rounded-lg border p-2 text-xs font-bold disabled:opacity-50 ${lot.expirationChoice === "date" ? "border-blue-500 bg-blue-100 text-blue-800" : "border-gray-300 bg-white text-gray-700"}`}>Has Expiration</button>
            </div>
            {lot.expirationChoice === "date" && (
              <div className={disabled ? "pointer-events-none opacity-50" : ""}>
                <SingleDatePicker value={lot.expirationDate ?? ""} text={`Lot ${index + 1} Expiration`} reason="supplier receipt" hasError={showErrors && !validISODate(lot.expirationDate)} onChange={date => updateLot(lot.clientId, {expirationDate: date})} />
              </div>
            )}
            {lot.expirationChoice === "notRequired" && <p className="text-xs font-bold text-green-700">No expiration date required</p>}
          </div>
        );
      })}
      {remaining > 0 && !disabled && <button type="button" onClick={() => onChange([...lots, createReceiptLot(remaining)])} className="w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-3 text-sm font-bold text-blue-800 hover:bg-blue-100">+ Add Lot for {remaining} Unallocated Units</button>}
      <div className={`rounded-lg p-2 text-xs font-bold ${validAll ? "bg-green-100 text-green-800" : showErrors ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-800"}`}>
        {validAll ? "All received units are allocated to valid lots." : remaining > 0 ? `${remaining} units are still unallocated.` : remaining < 0 ? `${Math.abs(remaining)} units exceed the received quantity.` : "Complete each lot's quantity and expiration decision."}
      </div>
    </section>
  );
}