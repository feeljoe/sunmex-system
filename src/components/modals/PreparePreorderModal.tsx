"use client";

import { useState } from "react";
import DifferenceReasonModal from "./DifferenceReasonModal";
import AdminAuthorizationModal from "./AdminAuthorizationModal";
import SubmitResultModal from "./SubmitResultModal";

export default function PrepareOrderModal({
    user, preorder, categories, onClose, readOnly, onCompleted,
}: {
    user: any; preorder: any; categories: any[]; readOnly?: boolean; onClose: () => void; onCompleted: () => void;
}){
    const [products, setProducts] = useState(
        preorder.products.map((p: any) => ({
            ...p,
            pickedQuantity: p.pickedQuantity ?? 0,
            differenceReason: p.differenceReason || p.deviationReason || null,
            adjusted: false,
        }))
    );

    const [activeProduct, setActiveProduct] = useState<any>(null);
    const [showAdminAuth, setShowAdminAuth] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [authIdPending, setAuthIdPending] = useState<string | undefined>(undefined);
    
    const [submitStatus, setSubmitStatus] = useState<"loading-warehouse" | "success-warehouse" | "error" | "info" | null>(null);
    const [message, setMessage] = useState("");
    const [isFullyCompleted, setIsFullyCompleted] = useState(false);

    const resolvedCount = products.filter((p: any) => p.pickedQuantity === p.quantity || p.differenceReason).length;
    const totalItems = products.length;
    const progressPercentage = totalItems === 0 ? 0 : Math.round((resolvedCount / totalItems) * 100);
    const allValid = resolvedCount === totalItems && totalItems > 0;

    const markPicked = (id: string) => {
        setProducts((prev: any[]) => prev.map((p) => {
            if (p._id !== id) return p;
            if (p.pickedQuantity > 0 || p.differenceReason) return { ...p, pickedQuantity: 0, differenceReason: null, adjusted: false };
            return { ...p, pickedQuantity: p.quantity, differenceReason: null, adjusted: false };
        }));
    };

    // The Master API Caller - handles both Partial Save and Full Complete
    const executeApiCall = async (isPartial: boolean, adminAuthId?: string) => {
        setSubmitStatus("loading-warehouse");
        try {
            const apiCall = fetch(`/api/preOrders/${preorder._id}/complete`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    isPartial,
                    products: products.map((p: any) => ({
                        productInventory : p.productInventory._id,
                        pickedQuantity: p.pickedQuantity,
                        differenceReason: p.differenceReason,
                        authorizedBy: p.differenceReason ? adminAuthId : undefined,
                    })),
                    assembledBy: user.id,
                }),
            });
            const minimumTimeLoader = new Promise(resolve => setTimeout(resolve, 3000));
            const [res] = await Promise.all([apiCall, minimumTimeLoader]);
            if(!res.ok){
                const err = await res.json();
                throw new Error(err.error || "Failed to save order");
            }
            setSubmitStatus("success-warehouse");
            setMessage(isPartial ? "Progress Saved!" : "Order Assembled Successfully");
        } catch (err: any) {
            setSubmitStatus("error");
            setMessage(`There was an error: ${err}`);
        }
    };

    const sortProducts = (a: any, b: any) => {
        const brandA = a.productInventory?.product?.brand?.name?.toLowerCase() || "";
        const brandB = b.productInventory?.product?.brand?.name?.toLowerCase() || "";
        
        if (brandA !== brandB) {
            return brandA.localeCompare(brandB);
        }
        
        const nameA = a.productInventory?.product?.name?.toLowerCase() || "";
        const nameB = b.productInventory?.product?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
    };

    // Grouping Engine: Matches products to categories and sorts by the Admin's configured order
    const groupedProducts = categories.map(cat => ({
        categoryName: cat.name,
        products: products
            .filter((p: any) => p.productInventory?.product?.productType?._id === cat._id)
            .sort(sortProducts)
    })).filter(g => g.products.length > 0);

    // Catch uncategorized products just in case
    const uncategorized = products.filter((p: any) => !p.productInventory?.product?.productType);
    if (uncategorized.length > 0) {
        groupedProducts.push({
            categoryName: "Uncategorized",
            products: uncategorized.sort(sortProducts)
        });
    }

    const getProgressBarColor = (percent: number) => {
        if (percent <= 33) return "bg-red-500";
        if (percent <= 75) return "bg-orange-500";
        if (percent <= 99) return "bg-yellow-400";
        return "bg-green-500";
      };

    return (
        <>
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-(--secondary) rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col space-y-2">
                {/* HEADER */}
                <div className="flex p-2 rounded-t-xl bg-(--tertiary) justify-between items-center mb-2">
                    <h2 className="text-sm lg:text-2xl font-semibold">
                    {readOnly ? "Review Order" : "Prepare Order"}: {preorder.number} - {preorder.client?.clientName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration:300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="w-full px-4 py-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 font-mono uppercase tracking-wider">
                    <span>Progress</span>
                    <span className={allValid ? "text-green-600" : ""}>
                    {resolvedCount} / {totalItems} Completed
                    </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                    className={`h-full transition-all duration-500 ease-out ${getProgressBarColor(progressPercentage)}`}
                    style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 p-2">
                    {groupedProducts.map(group => (
                        <div key={group.categoryName} className="rounded-xl p-2 bg-white shadow-xl">
                            <h3 className="text-xl font-bold text-center text-gray-800 border-b pb-2 mb-2 uppercase tracking-wider">{group.categoryName}</h3>
                            <div className="space-y-2">
                                {group.products.map((p:any) => (
                                    <div key={p._id} className={`flex items-center gap-3 shadow p-3 rounded-xl ${p.differenceReason ? "bg-orange-100 border border-orange-300" : p.pickedQuantity === p.quantity ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-400"}`}>
                                        <input disabled={readOnly} type="checkbox" checked={p.pickedQuantity === p.quantity || !!p.differenceReason} onChange={() => markPicked(p._id)} className="w-8 h-8 cursor-pointer"/>
                                        
                                        <div className={`w-24 text-center font-bold text-lg ${p.pickedQuantity === p.quantity ? "text-green-600" : p.differenceReason ? "text-orange-600" : ""}`}>
                                            {Math.round(p.pickedQuantity)} / {Math.round(p.quantity)}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="font-semibold capitalize text-lg">
                                                {p.productInventory.product.name} {p.productInventory.product.weight && (`(${p.productInventory.product.weight}${p.productInventory.product.unit?.toUpperCase()})`)}
                                            </div>
                                            <div className="text-sm text-gray-500 capitalize">
                                                SKU: {p.productInventory.product.sku} | UPC: {p.productInventory.product.upc} | Brand: {p.productInventory.product.brand?.name?.toLowerCase()}
                                            </div>
                                        </div>

                                        {p.differenceReason && <span className="text-sm font-bold text-orange-600 uppercase bg-orange-100 px-3 py-1 rounded">Short Picked ({p.differenceReason})</span>}
                                        {p.pickedQuantity === p.quantity && !p.differenceReason && <span className="text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded">PICKED</span>}
                                    
                                        {p.pickedQuantity !== p.quantity && !p.differenceReason && (
                                            <button disabled={readOnly} className="text-md text-red-600 underline cursor-pointer font-bold px-4" onClick={() => setActiveProduct(p)}>not enough?</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                { !readOnly &&(
                <div className="flex justify-between p-2">
                            <button 
                                onClick={() => executeApiCall(true)} 
                                className="bg-yellow-400 text-yellow-900 p-2 rounded-xl shadow-xl cursor-pointer font-bold hover:bg-yellow-500 transition-colors"
                            >
                                Save Progress
                            </button>
                            <button 
                                onClick={() => {
                                    const hasDifferences = products.some((p: any) => p.pickedQuantity !== p.quantity);
                                    if(hasDifferences) setShowAdminAuth(true);
                                    else setShowConfirmModal(true);
                                }}
                                disabled={resolvedCount !== totalItems}
                                className="bg-green-600 text-white p-2 rounded-xl shadow-xl disabled:opacity-50 cursor-pointer font-bold text-lg hover:bg-green-700 transition-colors"
                            >
                                Complete Order
                            </button>
                </div>
            )}
            </div>
        </div>

        {/* MODALS */}
        {activeProduct && (
            <DifferenceReasonModal
                product={activeProduct} onClose={() => setActiveProduct(null)}
                onConfirm={({ quantity, reason }) => {
                    setProducts((prev: any[]) => prev.map((p) => p._id === activeProduct._id ? { ...p, pickedQuantity: quantity, differenceReason: reason, adjusted: true } : p));
                    setActiveProduct(null);
                }}
            />
        )}
        
        {showAdminAuth && (
            <AdminAuthorizationModal
                onClose={() => setShowAdminAuth(false)}
                onAuthorized={(adminId) => {
                    setShowAdminAuth(false);
                    setAuthIdPending(adminId); // Save ID temporarily and move to final confirmation
                    setShowConfirmModal(true);
                }}
            />
        )}

        {showConfirmModal && (
             <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[60]">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 p-4 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <h2 className="text-2xl font-bold">Ready to Complete?</h2>
                    <p className="text-gray-600">This action will officially prepare the order, move inventory to the truck, and notify the driver. This cannot be undone.</p>
                    <div className="flex gap-4 w-full pt-4">
                        <button onClick={() => { setShowConfirmModal(false); setAuthIdPending(undefined); }} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300">Wait, Go Back</button>
                        <button onClick={() => { setShowConfirmModal(false); executeApiCall(false, authIdPending); }} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-xl">Yes, Complete</button>
                    </div>
                </div>
            </div>
        )}

        {submitStatus && (
            <SubmitResultModal 
                status={submitStatus} 
                message={message} 
                onClose={() => {
                    const wasSuccess = submitStatus.includes("success");
                    setSubmitStatus(null); 
                    if (wasSuccess) onCompleted();
                }} 
                collection="Preparation" 
            />
        )}
        </>
    );
}