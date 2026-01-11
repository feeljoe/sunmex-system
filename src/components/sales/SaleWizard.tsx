import { useState } from "react";
import ProductStep from "./steps/ProductStep";
import ClientStep from "./steps/ClientStep";
import ReviewStep from "./steps/ReviewStep";
import SignaturePad from "../ui/SignaturePad";

export type SaleMode = "preorder" | "direct";

export default function SaleWizard({ mode, userId }: { mode:SaleMode; userId:string; }) {
    const [step, setStep] = useState(1);
    const [client, setClient] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [signature, setSignature] = useState<string | null> (null);

    const submitSale = async () => {
        setLoading(true);
        const payload = {
            client: client._id,
            products: products.map((p) => ({
                productInventory: p.productInventory._id,
                quantity: p.quantity,
            })),
            seller: userId,
            ...(mode === "direct" && {signature}),
        };

        const endpoint =
        mode === "direct"
        ? "/api/direct-sales"
        : "/api/preOrders";

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify(payload),
        });

        setLoading(false);
        if(!res.ok){
            alert("Failed to submit sale");
            return;
        }

        window.location.href = 
        mode === "direct" ? "/sales" : "/preorders";
    };

    return (
        <div className="bg-(--secondary) rounded-xl shadow-xl p-6 space-y-6">
            {/* Step Indicator*/}
            <div className="flex gap-4 text-lg">
                <span className={step>=1 ? "font-bold": ""}>Client</span>
                <span className={step>=2 ? "font-bold": ""}>Products</span>
                <span className={step>=3 ? "font-bold": ""}>Review</span>
                {mode === "direct" && (
                    <span className={step>=4 ? "font-bold": ""}>Signature</span>
                )}
            </div>

            {step === 1 && (
                <ClientStep
                    mode={mode}
                    onSelect={(c: any) => {
                        setClient(c);
                        setStep(2);
                    }}
                />
            )}

            {step === 2 && (
                <ProductStep
                    mode={mode}
                    products={products}
                    setProducts={setProducts}
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                />
            )}

            {step === 3 && (
                <ReviewStep
                    client={client}
                    products={products}
                    loading={loading}
                    onBack={() => setStep(2)}
                    onConfirm={() =>
                        mode === "direct" ? setStep(4): submitSale()
                    }
                />
            )}

            {step === 4 && mode === "direct" && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Signature</h2>
                    <SignaturePad onSave={setSignature}/>
                    <button
                        disabled={!signature || loading}
                        onClick={submitSale}
                        className="bg-green-600 text-white px-5 py-3 rounded-xl disabled:opacity-50"
                    >
                        Complete Sale
                    </button>
                </div>
            )}
        </div>
    );
}