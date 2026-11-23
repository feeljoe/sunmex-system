"use client";

import { useEffect, useMemo, useState, useRef, useEffectEvent } from "react";
import StepSelectClient from "./StepSelectClient";
import StepAddProducts from "./StepAddProducts";
import StepConfirm from "./StepConfirm";
import SubmitResultModal from "@/components/modals/SubmitResultModal";
import { useList } from "@/utils/useList";
import { applyPricingLists } from "@/utils/applyPricingLists";
import SelectPreorderTypeModal from "@/components/modals/SelectPreorderTypeModal";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";
import StepAddProductsCatalog from "./StepAddProductsCatalog";

type PreorderWizardProps = {
  userRole: any;
  mode?: "create" | "edit";
  existingPreorder?: any;
};

export default function PreorderWizard({
  userRole,
  mode = "create",
  existingPreorder, }: PreorderWizardProps) {
  const isEdit = mode === "edit";
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; capturedAt: Date } | null>(null);


  const [outstandingBalance, setOutstandingBalance] = useState<{ total: number, invoices: string[] } | null>(null);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    const media = window.matchMedia("(max-width: 1279px)");

    const updateOverflow = () => {
      document.body.style.overflow = media.matches
        ? "hidden"
        : previousOverflow;
    };

    updateOverflow();

    media.addEventListener("change", updateOverflow);

    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", updateOverflow);
    };
  }, []);

  useEffect(() => {
    if (!existingPreorder) return;

    setSelectedClient(existingPreorder.client);

    setProducts(
      existingPreorder.products.map((p: any) => ({
        inventoryId: p.productInventory?._id,
        productId: p.productInventory?.product?._id,
        brand: p.productInventory?.product?.brand?.name,
        name: p.productInventory?.product?.name,
        unitPrice: p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0,
        weight: p.productInventory?.product?.weight,
        unit: p.productInventory?.product?.unit,
        caseSize: p.productInventory?.product?.caseSize,
        sku: p.productInventory?.product?.sku,
        quantity: p.quantity,
        pickedQuantity: p.pickedQuantity ?? 0,
        deliveredQuantity: p.deliveredQuantity ?? 0,
        deviationReason: p.deviationReason || "",
        maxQty: Math.round(Number(p.productInventory?.currentInventory || 0)) + Math.round(Number(p.quantity || 0)),
        image: p.productInventory?.product?.image ?? null,
        categoryId: p.productInventory?.product?.productType?._id ?? null,
        categoryName: p.productInventory?.product?.productType?.name ?? "Uncategorized",
      }))
    );

    setPreorderType(existingPreorder.type);
    setPreorderReason(existingPreorder.noChargeReason);

  }, [existingPreorder]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            capturedAt: new Date(),
          });
        },
        (error) => {
          console.warn("Could not get location: ", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    console.log("User location: ", userLocation);
  }, []);

  // STATE
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  const [invalidProducts, setInvalidProducts] = useState<string[]>([]);
  // EDIT
  const [step, setStep] = useState(isEdit ? 2 : 1);
  type ProductView = "standard" | "catalog";
  const [productView, setProductView] = useState<ProductView>("standard");
  const [showProductViewPrompt, setShowProductViewPrompt] = useState(false);
  const [checkingClientBalance, setCheckingClientBalance] = useState(false);
  const [pendingProductView, setPendingProductView] = useState<ProductView | null>(null);
  const balanceRequestId = useRef(0);
  const [selectedClient, setSelectedClient] = useState<any | null>(
    existingPreorder?.client || null);
  const [products, setProducts] = useState<any[]>(
    existingPreorder?.products?.map((p: any) => ({
      inventoryId: p.productInventory?._id,
      productId: p.productInventory?.product?._id,
      brand: p.productInventory?.product?.brand?.name,
      name: p.productInventory?.product?.name,
      unitPrice: p.unitPrice,
      weight: p.productInventory?.product?.weight,
      unit: p.productInventory?.product?.unit,
      caseSize: p.productInventory?.product?.caseSize,
      sku: p.productInventory?.product?.sku,
      quantity: p.quantity,
      pickedQuantity: p.pickedQuantity ?? 0,
      deliveredQuantity: p.deliveredQuantity ?? 0,
      deviationReason: p.deviationReason || "",
      maxQty: Math.round(Number(p.productInventory?.currentInventory || 0)) + Math.round(Number(p.quantity || 0)),
      image: p.productInventory?.product?.image ?? null,
      categoryId: p.productInventory?.product?.productType?._id ?? null,
      categoryName: p.productInventory?.product?.productType?.name ?? "Uncategorized",
    })) || []
  );

  useEffect(() => {
    if (invalidProducts.length > 0) {
      setInvalidProducts([]);
    }
  }, [products]);

  const [showPreorderType, setShowPreorderType] = useState(false);
  const [preorderType, setPreorderType] = useState(existingPreorder?.type || "");
  const [preorderReason, setPreorderReason] = useState(existingPreorder?.noChargeReason || "");

  const preorderStatus = existingPreorder?.status || "pending";

  const { items: pricingLists } = useList("/api/pricingLists", { limit: 1000 });
  const pricedProducts = useMemo(() => {
    return applyPricingLists(products, selectedClient, pricingLists).map(p => ({
      ...p,
      effectiveUnitPrice:
        p.effectiveUnitPrice != null &&
          Number.isFinite(Number(p.effectiveUnitPrice))
          ? Number(p.effectiveUnitPrice)
          : Number(p.unitPrice ?? 0),
    }));
  }, [products, selectedClient, pricingLists]);
  const total = useMemo(() => {
    return pricedProducts.reduce(
      (sum, p) => sum + p.quantity * p.effectiveUnitPrice,
      0
    );
  }, [pricedProducts]);

  const handleSelectedClient = async (client: any) => {
    const requestId = ++balanceRequestId.current;
    if (selectedClient?._id && selectedClient._id !== client._id) {
      setProducts([]);
    }
    setSelectedClient(client);
    if (isEdit) {
      setStep(2);
      return;
    }
    setOutstandingBalance(null);
    setPendingProductView(null);
    setCheckingClientBalance(true);
    setShowProductViewPrompt(true);
    try {
      const response = await fetch(`/api/clients/${client._id}/outstanding-balance`);
      if (!response.ok) {
        throw new Error("Unable to check client balance");
      }
      const data = await response.json();
      if (requestId !== balanceRequestId.current) return;
      setOutstandingBalance(data.hasBalance ? {
        total: Number(data.total ?? 0),
        invoices: data.invoices ?? [],
      } : null);
    } catch (error) {
      if (requestId !== balanceRequestId.current) return;
      console.log("Failed to check client outstanding balance: ", error);
      setOutstandingBalance(null);
    } finally {
      if (requestId === balanceRequestId.current) {
        setCheckingClientBalance(false);
      }
    }
  };
  const chooseProductView = (view: ProductView) => {
    if (pendingProductView !== null) return;
    setPendingProductView(view);
    if (!checkingClientBalance) {
      setProductView(view);
      setShowProductViewPrompt(false);
      setPendingProductView(null);
      setStep(2);
    }
  };
  useEffect(() => {
    if (checkingClientBalance || !pendingProductView || !showProductViewPrompt) return;
    setProductView(pendingProductView);
    setShowProductViewPrompt(false);
    setPendingProductView(null);
    setStep(2);
  }, [checkingClientBalance, pendingProductView, showProductViewPrompt]);
  // SUBMIT

  const executeSubmit = async () => {
    setSubmitStatus("loading");

    const body = {
      client: selectedClient?._id,
      location: userLocation,
      products: pricedProducts
        .filter(p => p.quantity > 0)
        .map(p => ({
          productInventory: p.inventoryId,
          quantity: p.quantity,
          unitPrice: p.effectiveUnitPrice,
          ...(isEdit && {
            pickedQuantity: p.pickedQuantity ?? 0,
            deliveredQuantity: p.deliveredQuantity ?? 0,
            deviationReason: p.deviationReason || null,
          }),
        })),
      type: preorderType,
      noChargeReason: preorderReason,
      total: preorderType === "noCharge" ? 0 : total,
    };

    const res = await fetch(
      isEdit ? `/api/preOrders/${existingPreorder._id}`
        : "/api/preOrders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      let message = error?.error || "Could not submit preorder";
      if (error?.details?.length) {
        setInvalidProducts(error.details.map((d: any) => d.inventoryId));
        message +=
          `\n\nIssues:\n\n` +
          error.details
            .map((d: any) =>
              `• ${d.name} (requested: ${d.requested ?? "-"}, available: ${d.available ?? "-"})`
            )
            .join("\n");
      }

      setMessage(message);
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("success");
    setMessage(isEdit ? "Preorder Updated" : "Preorder submitted");

    setTimeout(() => {
      router.replace("/pages/sales/preorders");
    }, 1000);
  };

  const submitPreorder = () => {
    // If there is a balance, show the warning modal first instead of submitting
    if(!hasSelectedProducts) return;
    if (outstandingBalance && outstandingBalance.total > 0 && !isEdit) {
      setShowBalanceWarning(true);
    } else {
      executeSubmit();
    }
  };

  // NAVIGATION

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      return (
        !!selectedClient &&
        !showProductViewPrompt &&
        !checkingClientBalance
      );
    }

    if (
      currentStep === 2 &&
      !isEdit
    ) {
      return products.some(
        (product) => Number(product.quantity) > 0
      );
    }

    return true;
  };

  const hasSelectedProducts = products.some((p) => Number(p.quantity) > 0);


  async function handleSubmit() {
    setSelectedClient(null);
    setProducts([]);
    setMessage("");
  }
  const next = () => {
    if (!validateStep(step)) return;
    if ((step === 1 || step === 2) && userRole === "admin" && !isEdit) {
      setShowPreorderType(true);
      return;
    } else if ((step === 1 || step === 2) && userRole !== "admin" && !isEdit) {
      setPreorderType("charge");
    }
    setStep(s => Math.min(s + 1, 3))
  };
  const back = () => setStep(s => Math.max(s - 1, 1));

  return (
    <>
      <div className="fixed inset-0 z-[80] flex h-[100dvh] w-screen min-h-0 flex-col overflow-hidden bg-blue-100 lg:relative lg:z-auto lg:mx-auto lg:h-[90dvh] lg:w-full lg:rounded-lg lg:shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-(--quarteary) px-3 py-2 pt-[max(8px, env(safe-area-inset-top))] lg:hidden">
          <div className="min-w-0 text-white">
            <p className="text-xs font-semibold opacity-75">
              Sales
            </p>
            <h1 className="truncate text-lg font-black">
              {isEdit ? "Edit Preorder" : " Make a new Preorder"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/pages/sales/preorders")}
            aria-label="Close preorder wizard"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>
        <div className="flex shrink-0 items-center justify-between p-1">
          <div className="flex min-w-0 shrink-0 gap-2">
            <span className="font-bold text-gray-600">
              Step {step} of 3
            </span>

            <span className="font-bold text-blue-700">
              {step === 1
                ? "Select Client"
                : step === 2
                  ? "Add Products"
                  : "Confirm Preorder"}
            </span>
          </div>
          {step === 2 && !isEdit && (
            <div className="flex min-w-0 items-center gap-1 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setProductView("standard")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${productView === "standard"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
                  }`}
              >
                Regular Entry
              </button>

              <button
                type="button"
                onClick={() => setProductView("catalog")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${productView === "catalog"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
                  }`}
              >
                Image Catalog
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {step === 1 && (
            <StepSelectClient
              userRole={userRole}
              selectedClient={selectedClient}
              onSelect={handleSelectedClient}
            />
          )}

          {showProductViewPrompt && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2">
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Choose sales experience"
                className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 shadow-2xl"
              >
                <div className="text-center">
                  <h2 className="text-xl font-black text-gray-900">
                    How would you like to continue?
                  </h2>
                  <p className="flex gap-2 mt-1 text-sm text-gray-500">
                    Client: {selectedClient?.clientName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => chooseProductView("standard")}
                    disabled={pendingProductView !== null}
                    className={`flex min-h-36 items-center justify-center gap-3 rounded-xl border-2 p-2 text-center text-green-800 transition-colors ${pendingProductView === "standard"
                      ? "border-blue-600 bg-blue-100" : "border-green-200 bg-green-50 hover:border-green-400"
                      }`}
                  >
                    {pendingProductView === "standard" && checkingClientBalance ? (
                      <svg
                        className="size-8 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-90"
                          fill="currentColor"
                          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                        />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    )}
                    <span className="text-base font-black">
                      Make a sale
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseProductView("catalog")}
                    disabled={pendingProductView !== null}
                    className={`flex min-h-36 items-center justify-center gap-3 rounded-xl border-2 p-2 text-blue-800 text-center transition-colors ${pendingProductView === "catalog"
                      ? "border-blue-600 bg-blue-100" : "border-blue-200 bg-blue-50 hover:border-blue-400"
                      }`}
                  >
                    {pendingProductView === "catalog" && checkingClientBalance ? (
                      <svg
                        className="size-8 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-90"
                          fill="currentColor"
                          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                        />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    )}
                    <span className="text-base font-black">
                      Show Catalog
                    </span>
                  </button>
                </div>
                {checkingClientBalance ? (
                  <p className="text-center text-xs font-semibold text-blue-700">
                    {pendingProductView ? "Finishing client balance check..." : "Checking previous outstanding balances..."}
                  </p>
                ) : (
                  <p className="text-center text-xs text-gray-500">
                    Select an option to continue.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    balanceRequestId.current += 1;
                    setShowProductViewPrompt(false);
                    setPendingProductView(null);
                    setCheckingClientBalance(false);
                    setSelectedClient(null);
                    setOutstandingBalance(null);
                  }}
                  className="min-h-11 w-full rounded-xl bg-gray-200 text-sm font-bold text-gray-700">
                  Back to Clients
                </button>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="flex h-full min-h-0 flex-col">
              <div className="h-full min-h-0 flex-1 overflow-hidden">
                {productView === "catalog" && !isEdit ? (
                  <StepAddProductsCatalog
                    products={products}
                    setProducts={setProducts}
                    selectedClient={selectedClient}
                    pricingLists={pricingLists}
                    total={total}
                    onComplete={next}
                  />
                ) : (
                  <StepAddProducts
                    userRole={userRole}
                    products={products}
                    setProducts={setProducts}
                    preorderStatus={preorderStatus}
                    invalidProducts={invalidProducts}
                    pricingLists={pricingLists}
                    selectedClient={selectedClient}
                    outstandingBalance={outstandingBalance}
                    preorderId={existingPreorder?._id}
                  />
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <StepConfirm
              client={selectedClient}
              products={pricedProducts}
              type={preorderType}
              total={total}
              view={productView}
              onRemoveProduct={(inventoryId: any) => {
                setProducts((previous) => previous.filter((p) => String(p.inventoryId) !== String(inventoryId)));
              }}
            />
          )}
        </div>

        {showPreorderType && (
          <SelectPreorderTypeModal
            onCancel={() => setShowPreorderType(false)}
            client={selectedClient}
            onConfirm={(reason: string, type: string) => {
              setPreorderType(type);
              setPreorderReason(reason);
              setShowPreorderType(false);
              setStep(step === 2 ? 3 : 2);
            }}
          />
        )}

        {submitStatus && (
          <SubmitResultModal
            status={submitStatus}
            message={message}
            onClose={() => {
              setSubmitStatus(null);
              if (submitStatus === "success") {
                handleSubmit();
                setStep(1);
              }
            }}
            collection="Preorder"
          />
        )}

        {showBalanceWarning && outstandingBalance && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-(--secondary) p-2 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4">
              <div className="flex justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-20 h-20 text-yellow-800 bg-yellow-400 p-2 rounded-full"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-red-600">Outstanding Balance</h2>
              <div className="bg-white rounded-xl border border-gray-200">
                <p className="text-center font-mono text-gray-700">
                  <span className="font-bold capitalize">{selectedClient?.clientName}</span> has an outstanding balance of: <span className="font-bold text-red-600 text-lg">{formatCurrency(outstandingBalance.total)}</span> from the invoice / invoices:
                </p>

                <div className="bg-red-50 p-2 m-2 rounded-xl text-center font-mono font-bold border border-red-200 text-red-800 max-h-32 overflow-y-auto">
                  {outstandingBalance.invoices.join(", ")}
                </div>

                <p className="text-center font-bold font-mono">Are you sure you want to make a sale for them again?</p>
              </div>
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => setShowBalanceWarning(false)}
                  className="p-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-700 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  No, Go Back
                </button>
                <button
                  onClick={() => { setShowBalanceWarning(false); executeSubmit(); }}
                  className="p-2 bg-red-400 text-red-800 hover:text-white rounded-xl hover:bg-red-800 font-bold transition-colors cursor-pointer shadow-xl"
                >
                  Yes, Make Sale
                </button>
              </div>
            </div>
          </div>
        )}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 py-2 pb-[max(6px,env(safe-area-inset-bottom))]">
          <div>
            {step > 1 &&
              !(step === 2 && productView === "catalog" && !isEdit) && (
                <button
                  type="button"
                  onClick={back}
                  className="min-h-11 rounded-xl bg-gray-200 px-4 text-sm font-bold text-gray-700"
                >
                  Go Back
                </button>
              )}
          </div>
          <div>
            {step < 3 ? (
              <button
                type="button"
                disabled={!validateStep(step)}
                onClick={next}
                className="min-h-11 rounded-xl bg-blue-400 text-blue-800 px-6 text-sm font-bold disabled:opacity-40"
              >
                {step === 2 ? "Next: Confirm" : "Next"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasSelectedProducts || submitStatus === "loading"}
                onClick={submitPreorder}
                className="min-h-11 rounded-xl bg-green-400 text-green-800 px-6 text-sm font-bold"
              >
                {isEdit ? "Update Sale" : "Complete Sale"}
              </button>
            )}
          </div>
        </footer>

      </div >
    </>
  );
}
