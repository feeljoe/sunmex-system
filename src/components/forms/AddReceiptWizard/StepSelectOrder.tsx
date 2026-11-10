"use client";

import { useEffect, useState } from "react";
import { createReceiptLot } from "@/components/supplierReceipts/ReceiptLotEditor";
import { formatCurrency } from "@/utils/format";

type Props = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onNext: () => void;
};

export default function StepSelectOrder({ setForm, onNext }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/supplierOrders/pending", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load pending supplier orders.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Pending orders API must return an array.");
        setOrders(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load supplier orders.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const selectOrder = (order: any) => {
    if (!Array.isArray(order.products) || !order.products.length) {
      setError("The selected supplier order has no products.");
      return;
    }
    if (order.products.some((line: any) => !line.product?._id)) {
      setError("This order has products that were not populated by the pending-orders API.");
      return;
    }
    setForm({
      supplierOrderId: order._id,
      supplier: order.supplier,
      poNumber: order.poNumber,
      requestedAt: order.requestedAt,
      invoice: "",
      items: order.products.map((line: any) => {
        const qty = Number(line.quantity);
        const cost = Number(line.product.unitCost ?? 0);
        return {
          product: line.product, // Keep populated product for name, brand, SKU and UPC.
          orderedQuantity: qty,
          receivedQuantity: qty,
          unitCost: cost,
          actualCost: cost,
          counted: false,
          lots: qty > 0 ? [createReceiptLot(qty)] : [],
        };
      }),
    });
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-center text-2xl font-semibold">Select Supplier Order</h2>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-center">Loading pending orders...</p>}
      {!loading && !orders.length && !error && <p className="text-center">No pending supplier orders found.</p>}
      <ul className="grid gap-4 px-2 py-2 text-center lg:grid-cols-2">
        {orders.map((order) => (
          <li key={order._id}>
            <button type="button" onClick={() => selectOrder(order)} className="w-full rounded-xl bg-(--primary) p-4 text-white transition-colors hover:bg-(--tertiary)">
              <strong>{order.poNumber}</strong> — {order.supplier?.name ?? "Unknown supplier"} | {formatCurrency(Number(order.expectedTotal ?? 0))}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}