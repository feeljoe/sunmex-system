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
    <div className="space-y-2 w-full flex flex-col">
      <h2 className="text-2xl font-semibold text-center">Confirm Credit Memo</h2>
      <div className="bg-white rounded-xl shadow-xl px-2 py-3 text-center">
      <p className="text-center text-lg"><b>Client:</b> {client.clientName}</p> <span className="text-gray-500 text-sm text-center">({client.billingAddress.addressLine}, {client.billingAddress.city}, {client.billingAddress.country}, {client.billingAddress.zipCode})</span>

      <div className="grid grid-cols-2 p-2 border-b text-left">
        <div>
        <span className="font-bold w-full capitalize">Product</span>
        </div>
        <div className="grid grid-cols-3 w-full text-center">
        <span className="font-bold text-center">Qty</span>
        <span className="font-bold text-center">Price</span>
        <span className="font-bold text-right">Reason</span>
        </div>
      </div>

      <ul className="grid grid-cols text-center">
        {products
          .filter(p => p.quantity > 0)
          .map(p => (
            <li key={p.productId} className="flex border-b justify-between py-3">
              <div className="flex flex-col items-center w-full">
              <span className="text-left capitalize text-sm w-full"><span className="capitalize">{p.brand && (<span className="font-bold">{p.brand} </span>)}{p.name?.toLowerCase()} {p.weight && p.unit && (<span>{p.weight}{p.unit?.toUpperCase()}</span>)} </span></span>
              <span className="text-left text-gray-400 text-xs w-full">(SKU: {p.sku})</span>
              </div>
              <div className="grid grid-cols-3 w-full">
              <span className="text-sm text-center">{p.quantity}</span>
              <span className="text-sm text-center">${p.effectiveUnitPrice.toFixed(2)}</span>
              <span className="text-sm text-right capitalize">{p.returnReason}</span>
              </div>
              </li>
          ))}
      </ul>

      <p className="font-bold mt-10 text-right text-xl">Total: ${total.toFixed(2)}</p>
      </div>
    </div>
  );
}
