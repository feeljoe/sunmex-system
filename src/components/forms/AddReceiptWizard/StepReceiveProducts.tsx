export default function StepReceiveProducts({ form, setForm, onNext, onBack }: any) {
    const updateItem = (idx: number, field: string, value: any) => {
      const items = [...form.items];
      items[idx][field] = value;
      setForm({ ...form, items });
    };
  
    const removeItem = (idx: number) => {
      const items = form.items.filter((_: any, i: number) => i !== idx);
      setForm({ ...form, items });
    };
    const total = form.items.reduce(
      (sum: number, i: any) =>
        sum + i.receivedQuantity * i.actualCost,
      0
    );
    const totalUnits = form.items.reduce(
      (sum:number, i:any) =>
        sum + i.receivedQuantity,
      0
    );

    const formatCurrency = (v?: number) =>
      v != null ? `$${v.toFixed(2)}` : "-";
  
    return (
      <div className="flex flex-col h-full justify-between">
        <div className="overflow-y-auto rounded-xl shadow-xl">
        <table className="w-full h-full">
          <thead className="bg-(--tertiary) text-sm lg:text-lg">
            <tr>
              <th className="p-2 whitespace-nowrap">Product</th>
              <th className="p-2 whitespace-nowrap">Ordered</th>
              <th className="p-2 whitespace-nowrap">Received</th>
              <th className="p-2 text-center whitespace-nowrap">Unit Cost</th>
              <th className="p-2 text-center whitespace-nowrap">Actual Cost</th>
              <th className="p-2 text-center whitespace-nowrap">Total</th>
              <th className="p-2 text-right whitespace-nowrap">Delete</th>
            </tr>
          </thead>
          <tbody className="bg-white text-sm lg:text-lg">
            {form.items.map((it: any, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="p-4 capitalize whitespace-nowrap flex flex-col">
                  <span>{it.product.brand.name.toLowerCase()} {it.product.name.toLowerCase()}</span>
                  <span className="text-gray-400"><b>SKU:</b>({it.product.sku}) <b>UPC:</b>({it.product.upc})</span></td>
                <td className="p-2 text-center whitespace-nowrap">{it.orderedQuantity}</td>
                <td className="p-2 text-center whitespace-nowrap">
                  <input
                    type="number"
                    value={it.receivedQuantity}
                    onChange={e =>
                      updateItem(idx, "receivedQuantity", Number(e.target.value))
                    }
                    className="w-20 text-center whitespace-nowrap"
                  />
                </td>
                <td className="p-2 text-center whitespace-nowrap">${it.unitCost.toFixed(2)}</td>
                <td className="p-2 text-center whitespace-nowrap">$
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={it.actualCost}
                    onChange={e =>
                      updateItem(idx, "actualCost", Number(e.target.value))
                    }
                    className="w-20 text-center whitespace-nowrap"
                  />
                </td>
                <td className="p-4 text-center whitespace-nowrap">{formatCurrency(it.receivedQuantity * it.actualCost)}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button 
                    onClick={() => removeItem(idx)}
                    className="bg-red-500 text-white hover:bg-red-300 px-2 py-2 text-lg rounded-xl transition-all duration:300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="text-right text-xl p-2">Units: <strong>{totalUnits}</strong></p>
        <p className="text-right text-2xl p-2">Total: <strong>{formatCurrency(total)}</strong></p>
        </div>
    );
  }
  