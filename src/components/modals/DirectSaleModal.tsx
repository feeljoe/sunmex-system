"use client";

import { useEffect, useState } from "react";
import SignaturePad from "../ui/SignaturePad";

export default function DirectSaleModal({onClose}: {onClose: () => void}){
    const [inventory, setInventory] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [clientId, setClientId] = useState("");
    const [signature, setSignature] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/routes/inventory")
        .then((r) => r.json())
        .then(setInventory);
    }, []);

    const submit = async () => {
        await fetch("api/direct-sales/create", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({clientId, products, signature}),
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl w-4/5 max-w-3xl">
                <h2 className="text-2xl font-semibold mb-4">Direct Sale</h2>
                {inventory.map((inv) => (
                    <div key={inv._id} className="flex justify-between">
                        <span>
                            {inv.product.brand.name} - {inv.product.name}
                        </span>
                        <button
                            onClick={() =>
                                setProducts((p) => [
                                    ...p,
                                    {
                                        productInventory: inv._id,
                                        quantity: 1,
                                        unitPrice: inv.product.unitPrice,
                                    },
                                ])
                            }
                        >
                            Add
                        </button>
                    </div>
                ))}

                <SignaturePad onSave={setSignature} />
                <button
                    disabled={!signature}
                    onClick={submit}
                    className="bg-green-600 text-white px-5 py-3 rounded-xl mt-4">
                        Complete Sale
                    </button>
            </div>
        </div>
    );
}