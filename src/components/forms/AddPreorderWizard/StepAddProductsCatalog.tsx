"use client";
import { useEffect, useMemo, useState } from "react";
import { applyPricingLists } from "@/utils/applyPricingLists";
import { formatCurrency } from "@/utils/format";
type Props = {
    products: any[];
    setProducts: React.Dispatch<React.SetStateAction<any[]>>;
    selectedClient: any;
    pricingLists: any[];
    total: number;
    onComplete: () => void;
};
const PAGE_SIZE = 50;
function CatalogImage({ src, alt }: { src: string | null; alt: string; }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        setFailed(false);
    }, [src]);
    if (!src || failed) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-gray-100 p-2 text-center text-gray-400">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="mb-2 h-9 w-9"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3h18v18H3V3Zm3 13 4-4 3 3 3-5 3 6"
                    />
                </svg>
                <span className="text-xs font-bold">
                    Image coming soon
                </span>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
        />
    );
}
export default function StepAddProductsCatalog({
    products,
    setProducts,
    selectedClient,
    pricingLists,
    total,
    onComplete,
}: Props) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);

    const [inventory, setInventory] = useState<any[]>([]);
    const [totalResults, setTotalResults] = useState<number | null>(null);
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState<any>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [loadingCategories, setLoadingCategories] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const controller = new AbortController();
        async function loadInventory() {
            setLoading(true);
            setError("");
            try {
                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(PAGE_SIZE),
                    catalogActiveOnly: "true",
                });
                if (debouncedSearch) {
                    params.set("search", debouncedSearch);
                }
                if (selectedCategory) {
                    params.set("type", selectedCategory);
                }
                const response = await fetch(
                    `/api/productInventory?${params.toString()}`,
                    {
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );
                if (!response.ok) {
                    throw new Error("Unable to retrieve product catalog.");
                }
                const data = await response.json();
                if (controller.signal.aborted) return;
                const rows = Array.isArray(data.items) ? data.items : [];
                const availableProducts = rows.filter((inv: any) => Math.floor(Number(inv.currentInventory ?? 0)) > 0);
                setInventory(availableProducts);
                const count = Number(data.total ?? data.meta?.total);
                const knownTotal = Number.isFinite(count) && count >= 0 ? count : null;
                setTotalResults(knownTotal);
                setHasNext(knownTotal !== null ? page * PAGE_SIZE < knownTotal : rows.length === PAGE_SIZE);
            } catch (err: any) {
                if (controller.signal.aborted) return;
                setInventory([]);
                setTotalResults(null);
                setHasNext(false);
                setError(err.message ?? "Failed to load inventory");
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }
        loadInventory();
        return () => controller.abort();
    }, [page, debouncedSearch, selectedCategory]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await fetch("/api/types?limit=100", { signal: controller.signal });
                if (!response.ok) {
                    throw new Error("Failed to load categories");
                }
                const data = await response.json();
                if (controller.signal.aborted) return;
                setCategories(Array.isArray(data.items) ? data.items : []);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.log("Error loading catalog categories: ", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingCategories(false);
                }
            }
        };
        fetchCategories();
        return () => controller.abort();
    }, []);


    const pricedInventory = useMemo(() => {
        return inventory.map((inv: any) => {
            const product = inv.product;

            const rawProduct = {
                productId: product._id,
                brandId: product.brand?._id,
                unitPrice: Number(product.unitPrice ?? 0),
            };

            const [pricedProduct] = applyPricingLists(
                [rawProduct],
                selectedClient,
                pricingLists
            );

            const effectiveUnitPrice =
                pricedProduct?.effectiveUnitPrice != null &&
                    Number.isFinite(
                        Number(pricedProduct.effectiveUnitPrice)
                    )
                    ? Number(pricedProduct.effectiveUnitPrice)
                    : Number(product.unitPrice ?? 0);

            return {
                ...inv,
                displayPrice: effectiveUnitPrice,
            };
        });
    }, [inventory, selectedClient, pricingLists]);

    const grouped = useMemo(() => {
        const sorted = [...pricedInventory].sort((a, b) => {
            const brandA = a.product?.brand?.name ?? "";
            const brandB = b.product?.brand?.name ?? "";

            const byBrand = brandA.localeCompare(
                brandB,
                undefined,
                { sensitivity: "base" }
            );
            if (byBrand !== 0) return byBrand;
            return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""),
                undefined, { sensitivity: "base" }
            );
        });
        const result = new Map<string, any[]>();
        for (const inv of sorted) {
            const brand = inv.product?.brand?.name ?? "No Brand";
            if (!result.has(brand)) result.set(brand, []);
            result.get(brand)!.push(inv);
        }
        return [...result.entries()];
    }, [pricedInventory]);

    const selectedById = useMemo(() => new Map(products.map((p) => [String(p.inventoryId), p])), [products]);
    const selectedUnits = products.reduce((sum, p) => sum + Number(p.quantity ?? 0), 0);
    const selectedLines = products.filter((p) => Number(p.quantity) > 0).length;

    const changeQuantity = (
        inv: any,
        value: number,
        mode: "increment" | "set" = "increment"
    ) => {
        const inventoryId = String(inv._id);

        const stock = Math.max(
            0,
            Math.floor(Number(inv.currentInventory ?? 0))
        );

        if (stock === 0) return;

        if (!Number.isFinite(value)) return;

        setProducts((previous) => {
            const existing = previous.find(
                (p) => String(p.inventoryId) === inventoryId
            );

            const previousQty = Number(
                existing?.quantity ?? 0
            );

            const requestedQty =
                mode === "set"
                    ? value
                    : previousQty + value;

            const nextQty = Math.max(
                0,
                Math.min(stock, Math.floor(requestedQty))
            );

            if (nextQty === 0) {
                return previous.filter(
                    (p) => String(p.inventoryId) !== inventoryId
                );
            }

            if (existing) {
                return previous.map((p) =>
                    String(p.inventoryId) === inventoryId
                        ? {
                            ...p,
                            quantity: nextQty,
                            maxQty: stock,
                        }
                        : p
                );
            }

            const product = inv.product;

            return [
                ...previous,
                {
                    inventoryId,
                    productId: product._id,
                    brandId: product.brand?._id,
                    brand: product.brand?.name ?? "",
                    name: product.name,
                    unitPrice: inv.displayPrice,
                    weight: product.weight,
                    unit: product.unit,
                    caseSize: product.caseSize,
                    sku: product.sku,
                    quantity: nextQty,
                    pickedQuantity: 0,
                    deliveredQuantity: 0,
                    deviationReason: "",
                    maxQty: stock,
                    image: product.image ?? null,
                    categoryId: product.productType?._id ?? null,
                    categoryName: product.productType?.name ?? "Uncategorized",
                },
            ];
        });
    };
    const totalPages = totalResults === null ? null : Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <div className="shrink-0 space-y-2 p-2">
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl bg-blue-900/50 p-2 text-white">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-white/70">
                            {selectedLines} products | {selectedUnits} units
                        </p>
                        <p className="text-xl font-black">
                            Subtotal: {formatCurrency(total)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold text-white/70">
                            Current Sale
                        </p>
                        <p className="text-sm font-bold">
                            Product Catalog
                        </p>
                    </div>
                </div>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search brand, product, SKU, UPC, vendorSKU..."
                    className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-2 text-gray-900 outline-none focus:border-blue-500"
                />
                <div className="min-w-0 w-full">
                    <div className="flex w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            onClick={() => handleCategoryChange("")}
                            aria-pressed={selectedCategory === ""}
                            className={`min-h-10 shrink-o whitespace-nowrap rounded-full capitalize px-3 py-1 text-xs font-bold transition-colors ${selectedCategory === "" ? "bg-blue-800 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}`}
                        >
                            All Products
                        </button>
                        {categories.map((category: any) => {
                            const isSelected = selectedCategory === String(category._id);
                            return (
                                <button
                                    key={category._id}
                                    type="button"
                                    onClick={() => handleCategoryChange(String(category._id))}
                                    aria-pressed={isSelected}
                                    className={`min-h-10 shrink-o whitespace-nowrap capitalize rounded-full px-3 py-1 text-xs font-bold transition-colors ${isSelected ? "bg-blue-800 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}`}
                                >
                                    {category.name?.toLowerCase()}
                                </button>
                            )
                        })}
                        {loadingCategories ?? (
                            <span className="shrink-0 text-xs text-gray-500">
                                Loading categories...
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2">
                {loading && (
                    <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
                        Loading products...
                    </div>
                )}
                {!loading && error && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {!loading && !error && inventory.length === 0 && (
                    <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
                        No products found.
                    </div>
                )}
                {!loading && !error && grouped.map(([brand, brandProducts]) => (
                    <section key={brand} className="space-y-1">
                        <div className="sticky top-0 z-10 bg-gray-200 p-2 shadow-sm">
                            <h3 className="text-sm font-black capitalize text-gray-900">
                                {brand?.toLowerCase()}
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                    ({brandProducts.length})
                                </span>
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 min-[1900px]:grid-cols-10 p-2">
                            {brandProducts.map((inv) => {
                                const product = inv.product ?? {};
                                const stock = Math.max(0, Math.floor(Number(inv.currentInventory ?? 0)));
                                const soldOut = stock === 0;
                                const selected = selectedById.get(String(inv._id));
                                const qty = Number(selected?.quantity ?? 0);
                                const name = [product.name, product.weight != null ? `${product.weight}${String(product.unit ?? "").toUpperCase()}` : ""].filter(Boolean).join(" ");
                                const originalPrice = Number(inv.product?.unitPrice ?? 0);
                                const displayPrice = Number(inv.displayPrice ?? originalPrice);
                                const hasDiscount = originalPrice > 0 && displayPrice >= 0 && displayPrice < originalPrice;
                                const discountPercentage = hasDiscount ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
                                return (
                                    <article
                                        key={inv._id}
                                        className={`flex min-w-0 flex-col overflow-hidden rounded-xl border-border-gray-200 bg-white shadow-sm ${soldOut ? "opacity-55" : ""
                                            }`}
                                    >
                                        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                            <CatalogImage
                                                src={product.image}
                                                alt={name}
                                            />
                                            {soldOut && (
                                                <span className="absolute left-1 top-1 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-col justify-between bg-gray-100 p-1 text-center">
                                            <p className="max-h-[2.25rem] h-[2.25rem] text-xs font-bold text-blue-900">
                                                {name}
                                            </p>
                                            <div className="flex min-h-[40px] items-center justify-center gap-2">
                                                {hasDiscount ? (
                                                    <>
                                                        <span className="text-xs font-medium text-gray-500 line-through">
                                                            {formatCurrency(originalPrice)}
                                                        </span>
                                                        <span className="text-base font-black text-blue-900">
                                                            {formatCurrency(displayPrice)}
                                                        </span>
                                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                                                            {discountPercentage}% OFF
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-base font-black text-blue-900">
                                                        {formatCurrency(displayPrice)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-1">
                                                {soldOut ? (
                                                    <div className="grid h-10 items-center bg-blue-200 rounded-full text-blue-900 font-bold">
                                                        Out of Stock
                                                    </div>
                                                ) : (
                                                    <div className="grid h-10 grid-cols-3 gap-2 items-center rounded-full">
                                                        <button
                                                            type="button"
                                                            disabled={qty === 0}
                                                            onClick={() => changeQuantity(inv, -1)}
                                                            aria-label={`Remove one ${name}`}
                                                            className="h-11 rounded-full bg-blue-200 text-xl font-bold text-blue-900 disabled:opacity-30"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            onFocus={(event) => event.target.select()}
                                                            onChange={(event) => changeQuantity(inv, Number(event.target.value), "set")}
                                                            value={qty}
                                                            max={stock}
                                                            min={0}
                                                            className="font-black bg-white h-full rounded-lg text-center tabular-nums text-blue-900"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={qty >= stock}
                                                            onClick={() => changeQuantity(inv, 1)}
                                                            aria-label={`Add one ${name}`}
                                                            className="h-full rounded-full bg-blue-200 text-xl font-bold text-blue-900 disabled:opacity-30"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
            <div className="flex shrink-0 items-center justify-between bg-white px-2 py-0.5">
                <button
                    type="button"
                    disabled={loading || page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl bg-(--secondary) p-2 text-sm font-bold disabled:opacity-40"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <span className="text-xs font-bold text-gray-600">
                    Page {page}
                    {totalPages !== null ? ` of ${totalPages}` : ""}
                </span>
                <button
                    type="button"
                    disabled={loading || !hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl bg-(--secondary) p-2 text-sm font-bold disabled:opacity-40"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
}