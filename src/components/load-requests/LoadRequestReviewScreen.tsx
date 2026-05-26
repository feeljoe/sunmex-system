"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitResultModal from "@/components/modals/SubmitResultModal";

export default function LoadRequestReviewScreen({
    loadRequestId,
}: {
    loadRequestId: string;
}) {
    const router = useRouter();

    const [loadRequest, setLoadRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchLoadRequest();
    }, []);

    async function fetchLoadRequest(){
        setLoading(true);

        const res = await fetch(
            `/api/load-requests/${loadRequestId}`
        );

        const data = await res.json();

        // Initialize editable quantities
        data.products = data.products.map((p: any) => ({
            ...p,
            approvedQuantity: "",
        }));

        setLoadRequest(data);
        setLoading(false);
    }

    function updateApprovedQty(
        productId: string,
        value: number,
    ) {
        setLoadRequest((prev: any) => ({
            ...prev,
            products: prev.products.map((p: any) =>
                p.product._id === productId
                    ? {
                        ...p,
                        approvedQuantity: value,
                    }
                    : p
            ),
        }));
    }

    function resetQuantities() {
        setLoadRequest((prev: any) => ({
            ...prev,
            products: prev.products.map((p: any) => ({
                ...p,
                approvedQuantity: "",
            })),
        }));
    }

    async function submitReview(reject = false) {
        try {
            setSubmitStatus("loading");

            const products = loadRequest.products.map((p: any) => ({
                product: p.product._id,
                requestedQuantity: p.requestedQuantity,
                quantity: reject
                    ? 0
                    : p.approvedQuantity === ""
                    ? p.requestedQuantity > p.currentInventory
                    ? p.currentInventory
                    : p.requestedQuantity
                    : Number(p.approvedQuantity),
            }));
            const res = await fetch(
                `/api/load-requests/${loadRequestId}/review`,
                {
                    method: "PATCH",
                    credentials: "include",
                    body: JSON.stringify({ products }),
                }
            );

            const data = await res.json();

            if(!res.ok) {
                setMessage(data.error || "Failed to review load request");
                setSubmitStatus("error");
                return;
            }
            setMessage("Load Request reviewed successfully");
            setSubmitStatus("success");
        } catch(err: any) {
            console.error(err);
            setMessage(`Something went wrong: ${err.message}`);
            setSubmitStatus("error");
        } finally {
        }
    }

    function handleSubmit(){
        setMessage("");
        setSubmitStatus(null);
        router.replace("/pages/inventory/load-requests");
    }

    if(loading){
        return (
            <SubmitResultModal
                status="loading"
                message={"Loading information..."}
                onClose={() => {
                }}
                collection="Load Request"
            />);
    }

    return (
        
        <div className="flex flex-col p-6 h-[75vh] w-[90vw] bg-(--secondary) rounded-xl shadow-xl ">
            <div className="flex-1 p-6 overflow-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Load Request Review</h1>
                    <p>
                        Request #: {loadRequest.LRNumber}
                    </p>
                    <p>
                        Requested By: {" "}
                        {loadRequest.requestedBy?.firstName}{" "}
                        {loadRequest.requestedBy?.lastName}
                    </p>
                </div>
                {/* PRODUCTS */}
                <div className="space-y-4">
                    {loadRequest.products.map((item: any) => {
                        const insufficientInventory = item.currentInventory < item.requestedQuantity;

                        return (
                        <div
                            key={item.product._id}
                            className="bg-white shadow-xl rounded-xl p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="font-semibold">
                                            {item.product?.brand?.name}{" "}
                                            {item.product?.name}
                                        </h2>
                                        <p className={`text-sm ${ insufficientInventory ? "text-red-500" : "text-gray-500"}`}>
                                            Current Inventory:{" "}
                                            {item.currentInventory}
                                        </p>
                                    </div>
                                    <div className="flex gap-6 items-center text-center">
                                        <div>
                                            <p className="text-xs text-gray-400">
                                                Requested
                                            </p>
                                            <p className="w-24 border rounded-lg p-2">
                                                {item.requestedQuantity}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">
                                                Approved
                                            </p>
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder={insufficientInventory ? String(item.currentInventory) : String(item.requestedQuantity)}
                                                max={item.currentInventory}
                                                value={item.approvedQuantity}
                                                onChange={(e) => updateApprovedQty(item.product._id, Number(e.target.value)) }
                                                className="w-24 border text-center rounded-lg p-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                    )})}
                </div>
            </div>
            {/* ACTIONS */}
            <div className="flex justify-between mt-8">
                    <button
                        onClick={resetQuantities}
                        disabled={submitStatus != null} 
                        className="px-4 py-2 rounded-xl bg-gray-500 text-white">
                        Reset
                    </button>
                    <button 
                        onClick={() => submitReview(true)}
                        disabled={submitStatus != null}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white">
                            Reject
                        </button>
                    <button 
                        onClick={() => submitReview(false)}
                        disabled={submitStatus != null}
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white">
                        Approve
                    </button>
                </div>
            {submitStatus && (
            <SubmitResultModal
                status={submitStatus}
                message={message}
                onClose={() => {
                    handleSubmit();
                }}
                collection="Load Request"
            />
          )}
        </div>
    )
}