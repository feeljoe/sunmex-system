"use client";

import { useState } from "react";
import DifferenceReasonModal from "./DifferenceReasonModal";
import AdminAuthorizationModal from "./AdminAuthorizationModal";
import SubmitResultModal from "./SubmitResultModal";

export default function PrepareOrderModal({
    user,
    preorder,
    onClose,
    readOnly,
    onCompleted,
}: {
    user: any;
    preorder: any;
    readOnly?: boolean;
    onClose: () => void;
    onCompleted: () => void;
}){
    const [products, setProducts] = useState(
        preorder.products.map((p: any) => ({
            ...p,
            pickedQuantity: p.pickedQuantity ?? 0,
            differenceReason: p.deviationReason || null, // Safely load existing reasons if any
            adjusted: false,
        }))
    );

    const [activeProduct, setActiveProduct] = useState<any>(null);
    const [showAdminAuth, setShowAdminAuth] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
    const [message, setMessage] = useState("");


    // Calculate progress based on resolved items. 
    // If it's fully picked OR it has a difference reason, it's "resolved".
    const resolvedCount = products.filter((p: any) => p.pickedQuantity === p.quantity || p.differenceReason).length;
    const totalItems = products.length;

    const markPicked = (id: string) => {
        setProducts((prev: any[]) =>
          prev.map((p) => {
            if (p._id !== id) return p;
            
            // If it has ANY picked quantity or a reason, uncheck it completely
            if (p.pickedQuantity > 0 || p.differenceReason) {
                return {
                    ...p,
                    pickedQuantity: 0,
                    differenceReason: null,
                    adjusted: false
                };
            }
            // Otherwise, pick it fully
            return {
                ...p,
                pickedQuantity: p.quantity,
                differenceReason: null,
                adjusted: false
            };
          })
        );
    };

    // Notice we accept adminId directly here to avoid React State closure bugs!
    const completePreorder = async (adminAuthId?: string) => {
        setSubmitStatus("loading");
        try {
            await fetch(`/api/preOrders/${preorder._id}/complete`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    products: products.map((p: any) => ({
                        productInventory : p.productInventory._id,
                        pickedQuantity: p.pickedQuantity,
                        differenceReason: p.differenceReason,
                        // If this item was shorted, attach the admin ID passed into the function
                        authorizedBy: p.differenceReason ? adminAuthId : undefined,
                    })),
                    assembledBy: user.id,
                }),
            });
            setSubmitStatus("success");
            setMessage("Preorder Assembled Successfully");
            onCompleted();
        } catch (err: any) {
            setSubmitStatus("error");
            setMessage(`There was an error: ${err}`);
            console.log("Error: ", err);
        }
        
    };

    const sortedProducts = [...products].sort((a,b) => {
        const brandA = a.productInventory.product.brand?.name?.toLowerCase() || "";
        const brandB = b.productInventory.product.brand?.name?.toLowerCase() || "";
        if(brandA !== brandB) return brandA.localeCompare(brandB);
        return a.productInventory.product.name.localeCompare(b.productInventory.product.name);
    });

    return (
        <>
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-4xl p-6 space-y-4">
                <h2 className="font-semibold text-2xl text-center">
                    {readOnly ? "Review Order" : "Prepare Order"}: {preorder.number} - {preorder.client?.clientName}
                </h2>
                <p className={`text-xl font-bold text-center ${resolvedCount === totalItems ? "text-green-600" : "text-gray-600"}`}>
                    Progress: {resolvedCount} / {totalItems} Items Resolved
                </p>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {sortedProducts.map((p) => (
                        <div
                            key={p._id}
                            className={`flex items-center gap-3 shadow p-3 rounded-xl ${p.differenceReason ? "bg-orange-50" : p.pickedQuantity === p.quantity ? "bg-green-50" : "bg-(--secondary)"}`}
                        >
                            {/* Simple Checked Logic: Checked if fully picked OR if a shortage was approved */}
                            <input 
                                id="checkbox" 
                                disabled={readOnly} 
                                type="checkbox" 
                                checked={p.pickedQuantity === p.quantity || !!p.differenceReason} 
                                onChange={() => markPicked(p._id)} 
                                className="w-8 h-8 cursor-pointer"
                            />

                            <div className={`w-24 text-center font-bold ${p.pickedQuantity === p.quantity ? "text-green-600" : p.differenceReason ? "text-orange-600" : ""}`}>
                                {Math.round(p.pickedQuantity)} / {Math.round(p.quantity)}
                            </div>
                            
                            <div className="flex-1">
                                <div className="font-semibold capitalize">
                                    {p.productInventory.product.brand?.name} - {p.productInventory.product.name} {p.productInventory.product.weight && (`(${p.productInventory.product.weight}${p.productInventory.product.unit?.toUpperCase()})`)}
                                </div>
                                <div className="text-md text-gray-600">
                                    SKU: {p.productInventory.product.sku} | UPC: {p.productInventory.product.upc}
                                </div>
                            </div>

                            {p.differenceReason && (
                                <span className="text-xs font-bold text-orange-600 uppercase">
                                    Short Picked ({p.differenceReason})
                                </span>
                            )}
                            {p.pickedQuantity === p.quantity && !p.differenceReason && (
                                <span className="text-md font-bold text-green-600">
                                    PICKED
                                </span>
                            )}
                        
                            {p.pickedQuantity !== p.quantity && !p.differenceReason && (
                                <button
                                    disabled={readOnly}
                                    className="text-md text-red-600 underline cursor-pointer font-bold"
                                    onClick={() => setActiveProduct(p)}
                                >
                                    not enough?
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between gap-3 pt-4">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl shadow-xl cursor-pointer hover:bg-gray-300 transition-all duration:300">
                        Cancel
                    </button>
                    { !readOnly &&(
                    <button 
                        onClick={() => {
                            const hasDifferences = products.some(
                                (p: any) => p.pickedQuantity !== p.quantity
                            );
                            if(hasDifferences){
                                setShowAdminAuth(true);
                            } else{
                                completePreorder(); // No admin auth needed for perfect orders
                            }
                        }}
                        disabled={resolvedCount !== totalItems}
                        className="bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl disabled:opacity-50 cursor-pointer"
                    >
                        Done
                    </button>
                    )}
                </div>
            </div>
        </div>
        {activeProduct && (
            <DifferenceReasonModal
                product={activeProduct}
                onClose={() => setActiveProduct(null)}
                onConfirm={({ quantity, reason }) => {
                    setProducts((prev: any[]) =>
                    prev.map((p) =>
                        p._id === activeProduct._id
                        ? {
                            ...p,
                            pickedQuantity: quantity,
                            differenceReason: reason,
                            adjusted: true,
                        }
                        : p
                    )
                );
                setActiveProduct(null);
                }}
            />
        )}
        {showAdminAuth && (
            <AdminAuthorizationModal
                onClose={() => setShowAdminAuth(false)}
                onAuthorized={(adminId) => {
                    setShowAdminAuth(false);
                    completePreorder(adminId); // Pass the ID directly!
                }}
            />
        )}
        {submitStatus && (
            <SubmitResultModal
                status={submitStatus}
                message={message}
                onClose={() => setSubmitStatus(null)}
                collection="Assembled Order"
            />
        )}
        </>
    );
}