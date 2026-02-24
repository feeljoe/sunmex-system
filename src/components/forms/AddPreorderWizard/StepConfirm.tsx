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
let totalQty= 0;
products.map((p:any) => {
  totalQty += p.quantity;
});
  return (
    <div className="space-y-4 w-full flex flex-col">
      <h2 className="text-2xl font-semibold text-center">Confirm Preorder</h2>
      <div className="flex flex-col bg-white rounded-xl shadow-xl p-2 text-center h-100">
      <p className="text-center text-lg"><b>Client:</b> {client.clientName}</p> <span className="text-gray-500 text-sm">({client.billingAddress.addressLine}, {client.billingAddress.city}, {client.billingAddress.country}, {client.billingAddress.zipCode})</span>
      <div className="grid grid-cols-2 p-2 border-b text-left">
        <div>
        <span className="font-bold w-full capitalize">Product</span>
        </div>
        <div className="grid grid-cols-3 w-full text-center">
        <span className="font-bold text-center">Qty</span>
        <span className="font-bold text-center">Price</span>
        <span className="font-bold text-right">Total</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <>
      <ul className="grid grid-cols text-center">
        {[...products]
        .filter(p => p.quantity > 0)
        .sort((a, b) => {
          const brandA = (a.brand || "").toLowerCase();
          const brandB = (b.brand || "").toLowerCase();

          if (brandA < brandB) return -1;
          if (brandA > brandB) return 1;

          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();

          return nameA.localeCompare(nameB);
        })
        .map(p => (
            <li key={p.inventoryId} className="flex border-b justify-between">
              <div className="flex flex-col items-center w-full">
              <span className="text-left capitalize w-full text-sm"><span className="capitalize">{p.brand && (<span className="font-bold">{p.brand} </span>)}{p.name?.toLowerCase()} {p.weight && p.unit && (<span>{p.weight}{p.unit?.toUpperCase()}</span>)} </span></span>
              <span className="text-left text-gray-400 text-xs w-full">(SKU: {p.sku})</span>
              </div>
              <div className="grid grid-cols-3 w-full">
              <span className="text-sm text-center">{Math.round(p.quantity)}</span>
              <span className="text-sm text-center">${p.effectiveUnitPrice.toFixed(2)}</span>
              <span className="text-sm text-right">${(p.quantity * p.effectiveUnitPrice).toFixed(2)}</span>
              </div>
              </li>
          ))}
      </ul>
      </>
      </div>
      </div>
      <p className="font-bold text-right text-xl">Total Units: {totalQty}</p>
      <p className="font-bold text-right text-xl">Total: ${type==="noCharge" ? 0.00 : total.toFixed(2)}</p>
    </div>
  );
}
