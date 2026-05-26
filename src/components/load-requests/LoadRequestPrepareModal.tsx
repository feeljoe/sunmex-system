"use client";

import { useState } from "react";
import DifferenceReasonModal from "../modals/DifferenceReasonModal";
import AdminAuthorizationModal from "../modals/AdminAuthorizationModal";
import SubmitResultModal from "../modals/SubmitResultModal";

export default function PrepareLoadRequestModal({
    user,
    loadRequest,
    onClose,
    onCompleted,
    readOnly,
}: {
    user: any;
    loadRequest: any;
    onClose: () => void;
    onCompleted: () => void;
    readOnly?: boolean;
}) {
    const [products, setProducts] = useState(
        loadRequest.products.map((p:any) => ({
            ...p,
            assembledQuantity: p.assembledQuantity ?? 0,
            differenceReason: p.differenceReason ?? null,
            adjusted: false,
        }))
    );
    const [submitStatus, setSubmitStatus] = useState< "loading" | "success" | "error" | null> (null);
    const [message, setMessage] = useState("");
    const [activeProduct, setActiveProduct] = useState<any>(null);

    const [showAdminAuth, setShowAdminAuth] = useState(false);

    const totalRequired = products.reduce(
        (sum: number, p: any) =>
            sum +
            (p.differenceReason
                ? p.assembledQuantity
                : p.approvedQuantity),
        0
    );

    const totalAssembled = products.reduce(
        (sum: number, p: any) =>
            sum + p.assembledQuantity,
        0
    );

    const markPicked = (productId: string) => {
        setProducts((prev: any[])=> 
            prev.map((p) =>
                p.product._id === productId
                    ? {
                        ...p,
                        assembledQuantity:
                            p.assembledQuantity ===
                            p.approvedQuantity
                                ? 0
                                : p.approvedQuantity,
                    }
                : p
            )
        );
    };

    const completeLoadRequest = async () => {
        setSubmitStatus("loading");
        const res = await fetch(
            `/api/load-requests/${loadRequest._id}/prepare`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    products: products.map((p:any) => ({
                        product: p.product._id,
                        assembledQuantity: p.assembledQuantity,
                        differenceReason: p.differenceReason,
                    })),
                }),
            }
        );
        const data = await res.json();

        if(!res.ok){
            setMessage("Failed to prepare load request");
            setSubmitStatus("error");
            return;
        }
        setMessage("Load Request Prepared successfully");
        setSubmitStatus("success");
        onCompleted();
    };
    function handleSubmit(){
        setMessage("");
    }

    const sortedProducts = [...products]
        .filter((p) => (p.approvedQuantity || 0) > 0)
        .sort(
        (a,b) => {
            const brandA =
                a.product.brand.name.toLowerCase();

            const brandB =
                b.product.brand.name.toLowerCase();
            
            if(brandA !== brandB) {
                return brandA.localeCompare(brandB);
            }
            return a.product.name.localeCompare(b.product.name);
        }
    );

    return (
        <>
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    
            <div className="bg-white rounded-xl shadow-xl w-4/5 max-w-5xl p-6 space-y-4">
    
              <h2 className="font-semibold text-2xl text-center">
    
                {readOnly
                  ? "Review"
                  : "Prepare"}{" "}
                Load Request:{" "}
                {loadRequest.LRNumber}
    
              </h2>
    
              <div className="text-center text-gray-600">
    
                Route:
                {" "}
                <span className="font-semibold">
                  {loadRequest.routeAssigned?.code}
                </span>
    
              </div>
    
              <p
                className={`text-xl font-bold text-center ${
                  Math.round(totalAssembled) ===
                  Math.round(totalRequired)
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                Progress:
                {" "}
                {Math.round(totalAssembled)}
                {" / "}
                {Math.round(totalRequired)}
              </p>
    
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
    
                {sortedProducts.map((p: any) => (
    
                  <div
                    key={p.product._id}
                    className={`flex items-center gap-3 shadow p-3 rounded-xl ${
                      p.adjusted
                        ? "bg-yellow-50"
                        : "bg-(--secondary)"
                    }`}
                  >
    
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={
                        p.differenceReason
                          ? p.assembledQuantity ===
                            p.assembledQuantity
                          : p.assembledQuantity ===
                            p.approvedQuantity
                      }
                      onChange={() =>
                        markPicked(p.product._id)
                      }
                      className="w-8 h-8"
                    />
    
                    <div
                      className={`w-28 text-center font-bold ${
                        p.assembledQuantity ===
                        p.approvedQuantity
                          ? "text-green-600"
                          : ""
                      }`}
                    >
    
                      {Math.round(
                        p.assembledQuantity
                      )}
    
                      {" / "}
    
                      {p.differenceReason
                        ? Math.round(
                            p.assembledQuantity
                          )
                        : Math.round(
                            p.approvedQuantity
                          )}
    
                    </div>
    
                    <div className="flex-1">
    
                      <div className="font-semibold">
    
                        {p.product.brand?.name}
                        {" - "}
                        {p.product.name}
    
                        {p.product.weight && (
                          <>
                            {" "}
                            (
                            {p.product.weight}
                            {p.product.unit?.toUpperCase()}
                            )
                          </>
                        )}
    
                      </div>
    
                      <div className="text-sm text-gray-600">
    
                        SKU:
                        {" "}
                        {p.product.sku}
    
                        {" | "}
    
                        UPC:
                        {" "}
                        {p.product.upc}
    
                      </div>
    
                      <div className="text-sm text-gray-500">
    
                        Requested:
                        {" "}
                        {p.requestedQuantity}
    
                        {" | "}
    
                        Approved:
                        {" "}
                        {p.approvedQuantity}
    
                      </div>
    
                    </div>
    
                    {p.differenceReason && (
                      <span className="text-xs text-orange-600">
    
                        Short Picked
                        {" "}
                        (
                        {p.differenceReason}
                        )
    
                      </span>
                    )}
    
                    {p.assembledQuantity ===
                      p.approvedQuantity && (
                      <span className="text-md text-green-600 font-semibold">
    
                        PICKED
    
                      </span>
                    )}
    
                    {p.assembledQuantity !==
                      p.approvedQuantity && (
                      <button
                        disabled={readOnly}
                        className="text-md text-red-600 underline cursor-pointer"
                        onClick={() =>
                          setActiveProduct(p)
                        }
                      >
                        not enough?
                      </button>
                    )}
    
                  </div>
    
                ))}
              </div>
    
              <div className="flex justify-between gap-3 pt-4">
    
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl shadow-xl hover:bg-gray-300 transition-all duration-300 cursor-pointer"
                >
                  Cancel
                </button>
    
                {!readOnly && (
                  <button
                    disabled={
                      totalAssembled !==
                      totalRequired
                    }
                    onClick={() => {
    
                      const hasDifferences =
                        products.some(
                          (p: any) =>
                            p.assembledQuantity !==
                            p.approvedQuantity
                        );
    
                      if (hasDifferences) {
                        setShowAdminAuth(true);
                      } else {
                        completeLoadRequest();
                      }
                    }}
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
              product={{
                ...activeProduct,
                quantity:
                  activeProduct.approvedQuantity,
              }}
              onClose={() =>
                setActiveProduct(null)
              }
              onConfirm={({
                quantity,
                reason,
              }) => {
    
                setProducts((prev: any[]) =>
                  prev.map((p) =>
                    p.product._id ===
                    activeProduct.product._id
                      ? {
                          ...p,
                          assembledQuantity:
                            quantity,
                          differenceReason:
                            reason,
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
              onClose={() =>
                setShowAdminAuth(false)
              }
              onAuthorized={() => {
                completeLoadRequest();
              }}
            />
          )}
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
        </>
      );
}