"use client";

export default function ReviewStep({
    client,
    products,
    onBack,
    onConfirm,
    loading,
}: {
    client: any;
    products: any[];
    onBack: () => void;
    onConfirm: () => void;
    loading: boolean;
}) {
    const total = products.reduce(
        (sum, p) =>
            sum + p.quantity * p.productInventory.product.unitPrice,
        0
    );

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review Sale</h2>

            <div className="border rounded-xl p-4">
                <p className="font-medium">Client</p>
                <p>{client.clientName}</p>
            </div>

            <div className="border rounded-xl">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Product</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p, i) => (
                            <tr key={i} className="border-t">
                                <td className="p-2">{p.productInventory.product.name}</td>
                                <td className="p-2">{p.quantity}</td>
                                <td className="p-2">${p.productInventory.product.unitPrice.toFixed(2)}</td>
                                <td className="p-2">${(p.quantity * p.productInventory.product.unitPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center text-xl font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <button
                    onClick={onBack}
                    className="px-5 py-3 rounded-xl shadow-xl bg-gray-200 cursor-pointer"
                > 
                    Back
                </button>
                <button
                    disabled={loading}
                    onClick={onConfirm}
                    className="bg-green-600 text-white px-5 py-3 rounded-xl disabled:opacity-50"
                >
                    {loading? "Submitting...": "Confirm"}
                </button>
            </div>
        </div>
    )
}