// StepConfirm.tsx
"use client";

export default function StepConfirm({
  client,
  products,
  total,
}: {
  client: any;
  products: any[];
  total: number;
}) {

  return (
    <div className="space-y-4 w-full flex flex-col">
      <h2 className="text-2xl font-semibold text-center">Confirm Preorder</h2>
      <div className="bg-white rounded-xl shadow-xl p-5">
      <p className="text-center"><b>Client:</b> {client.clientName}</p>

      <ul className="grid grid-cols text-center">
        {products
          .filter(p => p.quantity > 0)
          .map(p => (
            <li key={p.inventoryId} className="flex border-b justify-between py-3">
              <span className="text-left px-2 capitalize">{p.name.toLowerCase()}</span>
              <div className="flex justify-between">
              <span className="">×</span>
              <span>{p.quantity} ---</span>
              <span>${p.effectiveUnitPrice.toFixed(2)}</span>
              </div>
              </li>
          ))}
      </ul>

      <p className="font-bold mt-10 text-right text-xl">Total: ${total.toFixed(2)}</p>
      </div>
    </div>
  );
}
