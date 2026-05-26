export default function StepReviewDirect({ client, products, total }: any) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <h2 className="text-xl font-bold text-center">Confirm Sale</h2>
      <div className="p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-gray-600 font-bold uppercase">Client</p>
        <p className="text-lg capitalize">{client.clientName?.toLowerCase()} ({client.billingAddress?.addressLine?.toLowerCase()}, {client.billingAddress?.city?.toLowerCase()} {client.billingAddress?.state?.toLowerCase()}, {client.billingAddress?.zipCode?.toLowerCase()})</p>
      </div>
      <div className="flex-1 overflow-auto bg-white rounded-xl p-4 space-y-2">
        <div className="flex justify-between border-b-2">
          <div className="w-full border-l text-center">
            <span>Product</span>
          </div>
          <div className="flex justify-between w-full text-center">
            <span className="w-full border-l">Qty</span>
            <span className="w-full border-l">Price</span>
            <span className="w-full border-l border-r">Line Total</span>
          </div>
        </div>
        {products.map((p: any) => (
          <div key={p.inventoryId} className="flex justify-between border-b-2">
          <div className="w-full border-l">
            <span className="pl-2">{p.brand} {p.name} {p.weight ? `(${p.weight}${p.unit?.toUpperCase()})` : ``}</span>
          </div>
          <div className="flex justify-between w-full text-center">
            <span className="w-full border-l">{p.quantity}</span>
            <span className="w-full border-l">${p.unitPrice}</span>
            <span className="w-full border-l border-r">${(p.quantity * p.unitPrice).toFixed(2)}</span>
          </div>
        </div>
        ))}
      </div>
      <div className="text-right p-2">
        <p className="text-gray-500">Total Units: {products.reduce((a: any, b: any) => a + b.quantity, 0)}</p>
        <p className="text-2xl font-bold text-green-700">Total: ${total.toFixed(2)}</p>
      </div>
    </div>
  );
}