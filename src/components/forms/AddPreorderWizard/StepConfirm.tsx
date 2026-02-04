// StepConfirm.tsx
"use client";

export default function StepConfirm({
  client,
  products,
  total,
  type,
}: {
  client: any;
  products: any[];
  total: number;
  type: any;
}) {

  return (
    <div className="space-y-4 w-full flex flex-col">
      <h2 className="text-2xl font-semibold text-center">Confirm Preorder</h2>
      <div className="bg-white rounded-xl shadow-xl p-5">
      <p className="text-center text-lg"><b>Client:</b> {client.clientName} <span className="text-gray-500 text-sm">({client.billingAddress.addressLine}, {client.billingAddress.city}, {client.billingAddress.country}, {client.billingAddress.zipCode})</span></p>

      <div className="grid grid-cols-2 p-2 border-b">
        <div>
        <span className="font-bold w-full text-left capitalize">Product</span>
        </div>
        <div className="grid grid-cols-4 w-full text-center">
        <span className="font-bold">Quantity</span>
        <span className="font-bold"></span>
        <span className="font-bold">Price</span>
        <span className="font-bold">Total</span>
        </div>
      </div>
      <ul className="grid grid-cols text-center">
        {products
          .filter(p => p.quantity > 0)
          .map(p => (
            <li key={p.inventoryId} className="flex border-b justify-between py-3">
              <span className="text-left px-2 capitalize w-full">{p.name.toLowerCase()}</span>
              <div className="grid grid-cols-4 w-full">
              <span>{p.quantity}</span>
              <span>×</span>
              <span>${p.effectiveUnitPrice.toFixed(2)}</span>
              <span>${(p.quantity * p.effectiveUnitPrice).toFixed(2)}</span>
              </div>
              </li>
          ))}
      </ul>

      <p className="font-bold mt-10 text-right text-xl">Total: ${type==="noCharge" ? 0.00 : total.toFixed(2)}</p>
      </div>
    </div>
  );
}
