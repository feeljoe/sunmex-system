"use client";

export default function StepConfirm({
  route,
  products,
  onBack,
  onSubmit,
}: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Confirm Load</h2>

      <p>
        <b>Route:</b> {route.code}
      </p>

      <ul>
        {products.map((p: any) => (
          <li key={p.inventoryId}>
            {p.name} × {p.quantity}
          </li>
        ))}
      </ul>

      <div className="flex justify-between">
        <button onClick={onBack}>Back</button>
        <button onClick={onSubmit} className="btn-primary">
          Load Truck
        </button>
      </div>
    </div>
  );
}
