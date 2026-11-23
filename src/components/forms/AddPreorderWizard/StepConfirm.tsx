// StepConfirm.tsx
"use client";

import { formatCurrency } from "@/utils/format";
import { useMemo } from "react";

type ProductView = "standard" | "catalog";
interface StepConfirmProps {
  client: any;
  products: any[];
  total: number;
  type: string;
  view?: ProductView;
  onRemoveProduct?: (inventoryId: string) => void;
}
type CategoryGroup = {
  category: string;
  products: any[];
  totalUnits: number;
  subtotal: number;
};

export default function StepConfirm({
  client,
  products,
  total,
  type,
  view = "standard",
  onRemoveProduct,
}: StepConfirmProps) {
  const isNoCharge = type === "noCharge";
  const selectedProducts = useMemo(() => {
    return [...products].filter((p) => Number(p.quantity) > 0).sort((a, b) => {
      const brandComparison = String(a.brand ?? "").localeCompare(String(b.brand ?? ""), undefined, { sensitivity: "base" });
      if (brandComparison !== 0) return brandComparison;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" });
    });
  }, [products]);
  const totalUnits = selectedProducts.reduce((sum, p) => sum + Number(p.quantity ?? 0), 0);
  const totalLines = selectedProducts.length;
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groups = new Map<string, CategoryGroup>();
    for (const product of selectedProducts) {
      const category = String(product.categoryName || "Uncategorized");
      if (!groups.has(category)) {
        groups.set(category, {
          category, products: [], totalUnits: 0, subtotal: 0,
        });
      }
      const group = groups.get(category)!;
      const quantity = Number(product.quantity ?? 0);
      const unitPrice = Number(product.effectiveUnitPrice ?? product.unitPrice ?? 0);
      group.products.push(product);
      group.totalUnits += quantity;
      group.subtotal += quantity * unitPrice;
    }
    return [...groups.values()].sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: "base" }));
  }, [selectedProducts]);
  const payableTotal = isNoCharge ? 0 : total;
  const addressParts = [
    client?.billingAddress?.addressLine,
    client?.billingAddress?.city,
    client?.billingAddress?.state,
    client?.billingAddress?.zipCode,
  ].filter(Boolean);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 p-1">
      <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-base font-black capitalize text-gray-900">
              {client?.clientName?.toLowerCase() ?? "Selected Client"}
            </h2>
            {addressParts.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {addressParts.join(", ")}
              </p>
            )}
          </div>
          <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${isNoCharge ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
            {isNoCharge ? "No charge" : "Charge"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y">
        {selectedProducts.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-white p-5 text-center">
            <p className="text-lg font-bold text-gray-800">
              No Products Selected
            </p>
            <p className="text-sm text-gray-500">
              Go back to the product selection step to add items to this preorder.
            </p>
          </div>
        ) : view === "catalog" ? (
          <div className="space-y-4">
            {categoryGroups.map((group) => (
              <section
                key={group.category}
                className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-blue-50 p-2">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-black capitalize text-blue-800">
                      {group.category}
                    </h3>
                    <p className="text-[11px] font-semibold text-gray-500">
                      {group.products.length} products | {group.totalUnits} units
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-blue-800">
                    Subtotal: {formatCurrency(isNoCharge ? 0 : group.subtotal)}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.products.map((product) => {
                    const quantity = Number(product.quantity ?? 0);
                    const unitPrice = Number(product.effectiveUnitPrice ?? product.unitPrice ?? 0);
                    const lineTotal = quantity * unitPrice;
                    return (
                      <article
                        key={String(product.inventoryId)}
                        className="p-2 flex gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col gap-1 w-36 sm:w-40 shrink-0 items-center overflow-hidden rounded-xl bg-gray-50">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name ?? "Product"}
                                loading="lazy"
                                className="w-30 sm:w-40 object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 sm:w-40 sm:h-40">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                                <span className="text-[10px] font-semibold">No Image</span>
                              </div>
                            )}
                            <h4 className="flex flex-col items-center text-center break-words text-xs sm:text-sm font-bold capitalize text-gray-900">
                            {product.brand && (
                              <span className="font-black">{product.brand.toUpperCase()}{" "}</span>
                            )}
                            <span>{product.name}</span> 
                            {product.weight && product.unit && (
                              <span className="font-normal">{" "}{product.weight}{String(product.unit).toUpperCase()}</span>
                            )}
                          </h4>
                          <p className="mt-1 text-[11px] text-gray-500">
                            SKU: {product.sku ?? "-"}
                          </p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-between items-center min-w-0 flex-1">
                          <div className="flex flex-wrap sm:w-full sm:justify-between items-center gap-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-center text-gray-400">
                                Quantity
                              </p>
                              <p className="text-sm font-black text-center text-gray-900">
                                {quantity}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-center font-bold uppercase text-gray-400">
                                Unit Price
                              </p>
                              <p className="text-center text-sm font-black text-blue-800">
                                {formatCurrency(isNoCharge ? 0 : unitPrice)}
                              </p>
                            </div>
                          </div>
                          <div className="sm:w-full rounded-lg bg-gray-100 px-3 py-2">
                            <p className="text-center text-[10px] font-bold uppercase text-gray-500">
                              Line Total
                            </p>
                            <p className="text-center font-black text-gray-900">
                              {formatCurrency(isNoCharge ? 0 : lineTotal)}
                            </p>
                          </div>
                          {onRemoveProduct && (
                            <button
                              type="button"
                              onClick={(() => onRemoveProduct(String(product.inventoryId)))}
                              className="inline-flex sm:w-full sm:justify-center min-h-10 items-center gap-2 rounded-lg bg-red-100 px-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                              <span className="hidden sm:block">Remove Product</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="grid grid-cols-2 border-b bg-gray-100 p-2 text-xs font-black text-gray-800 sm:text-sm">
              <span>Product</span>
              <div className="grid grid-cols-3 gap-1 text-center">
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {selectedProducts.map((product) => {
                const quantity = Number(product.quantity ?? 0);
                const unitPrice = Number(product.effectiveUnitPrice ?? product.unitPrice ?? 0);
                return (
                  <div
                    key={String(product.inventoryId)}
                    className="grid grid-cols-2 gap-2 p-2"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-xs font-bold capitalize text-gray-900 sm:text-sm">
                        {product.brand}{" "}{product.name}{" "}{product.weight ?? ""}{product.unit?.toLowerCase() ?? ""}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-500">
                        SKU: {product.sku}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-1 text-center text-xs sm:text-sm">
                      <span>{quantity}</span>
                      <span>{formatCurrency(isNoCharge ? 0 : unitPrice)}</span>
                      <span className="font-bold text-right">{formatCurrency(isNoCharge ? 0 : quantity * unitPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-gray-600 sm:text-sm">
          <span>Products</span>
          <span>{totalLines}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-bold text-gray-600 sm:text-sm">
          <span>Total Units</span>
          <span>{totalUnits}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2">
          <span className="text-base font-black text-gray-900">
            Grand Total
          </span>
          <span className="text-xl font-black text-blue-800">{formatCurrency(payableTotal)}</span>
        </div>
        {isNoCharge && (
          <p className="mt-1 text-right text-xs font-semibold text-orange-700">
            No-charge preorder
          </p>
        )}
      </div>
    </div>
  );
}
