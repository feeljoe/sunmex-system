"use client";
import { useEffect, useState } from "react";

export default function StepSelectOrder({ form, setForm, onNext }: any) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/supplierOrders/pending")
      .then(r => r.json())
      .then(setOrders);
  }, []);

  const selectOrder = (order: any) => {
    setForm({
      ...form,
      supplierOrderId: order._id,
      supplier: order.supplier,
      poNumber: order.poNumber,
      requestedAt: order.requestedAt,
      items: order.products.map((p: any) => ({
        product: p.product,
        orderedQuantity: p.quantity,
        receivedQuantity: p.quantity,
        unitCost: p.product.unitCost,
        actualCost: p.product.unitCost,
      })),
    });
    onNext();
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center mb-4">Select Supplier Order</h2>

      <ul className="space-y-2 text-center">
        {orders.map(o => (
          <li
            key={o._id}
            className="p-4 bg-(--primary) text-white rounded-xl cursor-pointer hover:bg-(--tertiary) transition-all duration-300"
            onClick={() => selectOrder(o)}
          >
            <strong>{o.poNumber}</strong> — {o.supplier.name}
          </li>
        ))}
      </ul>
    </>
  );
}
