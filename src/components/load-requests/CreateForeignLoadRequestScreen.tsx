"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitResultModal from "../modals/SubmitResultModal";

type Location = "yuma" | "tucson" | "elPaso" | "lasVegas";

interface Product {
    _id: string;
    name: string;
    sku?: string;
    upc?: string;
    weight?: number;
    unit?: string;
    caseSize?: number;
    brand?: {
        _id?: string;
        name?: string;
    };
}

interface TransferProduct {
    product: Product;

    foreignCurrentInventory: number;
    phoenixCurrentInventory: number;
    requestedQuantity: number | "";
}
const LOCATIONS: {
    value: Location;
    label: string;
}[] = [
        { value: "yuma", label: "Yuma" },
        { value: "tucson", label: "Tucson" },
        { value: "elPaso", label: "El Paso" },
        { value: "lasVegas", label: "Las Vegas" },
    ];

export default function CreateForeignLoadRequestScreen() {
    const router = useRouter();
    const [location, setLocation] = useState<Location | "">("");
    const [products, setProducts] = useState<TransferProduct[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [addProductOpen, setAddProductOpen] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
    const [message, setMessage] = useState("");

    // =============================================
    // LOAD DESTINATION INVENTORY
    // =============================================

    useEffect(() => {
        if (!location) {
            setProducts([]);
            return;
        }
        fetchDestinationInventory();
    }, [location]);

    async function fetchDestinationInventory() {
        try {
            setLoadingInventory(true);
            const res = await fetch(`/api/foreignInventory?location=${location}`, {
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load foreign inventory");
            }

            const mappedProducts: TransferProduct[] = (
                data.items || []
            ).map((item: any) => ({
                product: {
                    ...item.product,
                    uom: item.product.unit,
                },
                foreignCurrentInventory: Number(item.currentInventory) || 0,
                phoenixCurrentInventory: 0,
                requestedQuantity: "",
            }));

            if (mappedProducts.length > 0) {
                const ids = mappedProducts.map((p) => p.product._id).join(",");

                const inventoryRes = await fetch(`/api/product-inventory?products=${ids}`,
                    {
                        credentials: "include",
                    }
                );
                const inventoryData = await inventoryRes.json();

                if (inventoryRes.ok) {
                    const inventoryMap = new Map<string, number>();

                    const inventoryItems = Array.isArray(inventoryData) ? inventoryData : inventoryData.items || [];

                    inventoryItems.forEach((inv: any) => {
                        const productId = typeof inv.product === "string"
                            ? inv.product : inv.product?._id;

                        if (productId) {
                            inventoryMap.set(
                                productId,
                                Number(inv.currentInventory) || 0
                            );
                        }
                    });

                    mappedProducts.forEach((item) => {
                        item.phoenixCurrentInventory = inventoryMap.get(item.product._id) || 0;
                    });

                }
            }
            setProducts(mappedProducts);
        } catch (error: any) {
            console.error(error);
            setMessage(error.message || "Failed to load destination inventory");
            setSubmitStatus("error");
        } finally {
            setLoadingInventory(false);
        }
    }

    // =============================================
    // UPDATE SEND QUANTITY
    // =============================================

    function updateQuantity(productId: string, value: number | "") {
        setProducts((prev) =>
            prev.map((item) =>
                item.product._id === productId
                    ? {
                        ...item,
                        requestedQuantity: value,
                    }
                    : item
            )
        );
    }

    // =============================================
    // REMOVE PRODUCT
    // =============================================

    function removeProduct(productId: string) {
        setProducts((prev) =>
            prev.filter(
                (item) => item.product._id !== productId
            )
        );
    }

    // =============================================
    // ADD PRODUCT FROM PRODUCT SEARCH
    // =============================================

    function handleAddProduct(product: Product, phoenixInventory: number) {
        const exists = products.some(
            (p: any) => p.product._id === product._id
        );

        if (exists) {
            setAddProductOpen(false);
            return;
        }
        setProducts((prev) => [
            ...prev,
            {
                product,
                foreignCurrentInventory: 0,
                phoenixCurrentInventory: Number(phoenixInventory) || 0,
                requestedQuantity: "",
            },
        ]);
        setAddProductOpen(false);
    }

    // =============================================
    // PRODUCTS ACTUALLY BEING SENT
    // =============================================

    const selectedProducts = useMemo(
        () =>
            products.filter(
                (p) =>
                    p.requestedQuantity !== "" &&
                    Number(p.requestedQuantity) > 0
            ),
        [products]
    );

    const totalUnits = useMemo(
        () =>
            selectedProducts.reduce(
                (total, p) =>
                    total + Number(p.requestedQuantity) || 0,
                0
            ),
        [selectedProducts]
    );

    // =============================================
    // CREATE LOAD REQUEST
    // =============================================

    async function createLoadRequest() {
        if (!location) {
            setMessage("Please select a destination");
            setSubmitStatus("error");
            return;
        }

        if (selectedProducts.length === 0) {
            setMessage("Please enter a quantity for at least one product.");
            setSubmitStatus("error");
            return;
        }
        for (const item of selectedProducts) {
            const qty = Number(item.requestedQuantity);

            if (qty <= 0) {
                setMessage(`Invalid quantity for ${item.product?.brand?.name} ${item.product?.name} ${item.product?.weight}${item.product?.unit?.toUpperCase()}`);
                setSubmitStatus("error");
                return;
            }

            if (qty > item.phoenixCurrentInventory) {
                setMessage(`Not enough Phoenix Inventory for ${item.product?.brand?.name} ${item.product?.name} ${item.product?.weight}${item.product?.unit?.toUpperCase()}. Available: ${item.phoenixCurrentInventory}`);
                setSubmitStatus("error");
                return;
            }
        }
        try {
            setSubmitStatus("loading");
            setMessage("");

            const res = await fetch("/api/load-requests/foreign", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    location,
                    products: selectedProducts.map((item) => ({
                        product: item.product._id,
                        requestedQuantity: Number(item.requestedQuantity),
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create foreign load request");
            }
            setMessage(`${data.loadRequest?.LRNumber || "Load Request"} created successfully`);

            setSubmitStatus("success");
        } catch (error: any) {
            console.error("Error: ", error);
            setMessage(error.message || "Failed to create load request");
            setSubmitStatus("error");
        }
    }

    // =============================================
    // UI
    // =============================================
    return (
        <>
            {/* =====================================
                HEADER
            ===================================== */}

            <div className="p-2 flex justify-between items-center mb-2">
                <div className="w-full">
                    <h1 className="text-2xl md:text-4xl text-center dark:text-white font-bold">
                        Create Inventory Transfer
                    </h1>

                    <p className="text-sm md:text-[16px] text-gray-600 text-center dark:text-white mt-1">
                        Transfer inventory from Phoenix to another
                        warehouse location.
                    </p>
                </div>
            </div>
            <div className="p-2 w-full flex items-center justify-center">
                <div className="flex flex-col p-2 h-[80vh] w-[85vw] rounded-xl bg-(--secondary) shadow-xl font-mono font-bold">

                    {/* =====================================
                DESTINATION
            ===================================== */}

                    <div className="flex w-1/4 gap-5 items-center justify-center rounded-xl p-3 mb-2">

                        <label className="">
                            Destination
                        </label>
                        <div className="cursor-pointer rounded-xl bg-white max-w-md h-10 shadow-xl">
                            <select
                                value={location}
                                onChange={(e) =>
                                    setLocation(
                                        e.target.value as Location | ""
                                    )
                                }
                                disabled={submitStatus === "loading"}
                                className="p-2 h-full w-full rounded-xl cursor-pointer"
                            >
                                <option value="">
                                    Select destination...
                                </option>

                                {LOCATIONS.map((loc) => (
                                    <option
                                        key={loc.value}
                                        value={loc.value}
                                    >
                                        {loc.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* =====================================
                NO LOCATION
            ===================================== */}

                    {!location && (
                        <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-xl">

                            <div className="text-center text-gray-500">

                                <p className="text-xl">
                                    Select a destination
                                </p>

                                <p className="text-sm mt-2">
                                    Select Yuma, Tucson, El Paso or Las
                                    Vegas to view its current inventory.
                                </p>

                            </div>

                        </div>
                    )}

                    {/* =====================================
                LOADING
            ===================================== */}

                    {location && loadingInventory && (
                        <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-xl">
                            <p className="text-xl">
                                Loading inventory...
                            </p>
                        </div>
                    )}

                    {/* =====================================
                INVENTORY
            ===================================== */}

                    {location && !loadingInventory && (
                        <div className="flex-1 flex flex-col overflow-hidden">

                            {/* ACTION BAR */}

                            <div className="flex justify-between items-center mb-3">

                                <div>
                                    <h2 className="text-lg">
                                        {
                                            LOCATIONS.find(
                                                (l) => l.value === location
                                            )?.label
                                        }{" "}
                                        Inventory
                                    </h2>

                                    <p className="text-sm text-gray-600">
                                        {products.length} products currently
                                        displayed
                                    </p>
                                </div>

                                <button
                                    onClick={() =>
                                        setAddProductOpen(true)
                                    }
                                    className="p-2 bg-green-400 text-green-800 hover:bg-green-800 hover:text-white rounded-xl transition-all duration-300 cursor-pointer"
                                >
                                    + Add Product
                                </button>

                            </div>

                            {/* TABLE */}

                            <div className="flex-1 overflow-auto bg-white rounded-xl shadow-xl">

                                <table className="w-full text-left text-sm">

                                    <thead className="bg-(--tertiary) sticky top-0">

                                        <tr>
                                            <th className="p-3">
                                                Product
                                            </th>

                                            <th className="p-3">
                                                SKU
                                            </th>

                                            <th className="p-3 text-center">
                                                Destination Inventory
                                            </th>

                                            <th className="p-3 text-center">
                                                Phoenix Available
                                            </th>

                                            <th className="p-3 text-center">
                                                Case Size
                                            </th>

                                            <th className="p-3 text-center">
                                                Cases
                                            </th>

                                            <th className="p-3 text-center">
                                                Send Units
                                            </th>

                                            <th className="p-3 text-center">
                                                Remove
                                            </th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {products.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="p-10 text-center text-gray-500"
                                                >
                                                    <p className="text-xl">
                                                        No inventory currently recorded for{" "}
                                                        {
                                                            LOCATIONS.find(
                                                                (l) =>
                                                                    l.value === location
                                                            )?.label
                                                        }.
                                                    </p>

                                                    <p className="mt-2">
                                                        Use "+ Add Product" to send the
                                                        first products to this location.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}

                                        {products.map((item) => {

                                            const caseSize =
                                                item.product.caseSize || 1;

                                            const cases =
                                                item.requestedQuantity === ""
                                                    ? ""
                                                    : Number(
                                                        item.requestedQuantity
                                                    ) / caseSize;

                                            const insufficient =
                                                item.requestedQuantity !== "" &&
                                                Number(
                                                    item.requestedQuantity
                                                ) >
                                                item.phoenixCurrentInventory;

                                            return (
                                                <tr
                                                    key={item.product._id}
                                                    className="border-b"
                                                >

                                                    {/* PRODUCT */}

                                                    <td className="p-3">
                                                        <div>
                                                            <p>
                                                                {item.product.brand?.name}{" "}
                                                                {item.product.name}{" "}
                                                                {item.product.weight}{item.product.unit?.toUpperCase()}
                                                            </p>

                                                            {item.product.upc && (
                                                                <p className="text-xs text-gray-500">
                                                                    UPC: {item.product.upc}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* SKU */}

                                                    <td className="p-3">
                                                        {item.product.sku || "-"}
                                                    </td>

                                                    {/* FOREIGN INVENTORY */}

                                                    <td className="p-3 text-center">
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-xl">
                                                            {
                                                                item.foreignCurrentInventory
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* PHOENIX */}

                                                    <td className="p-3 text-center">
                                                        <span
                                                            className={`px-3 py-1 rounded-xl ${insufficient
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-green-100 text-green-700"
                                                                }`}
                                                        >
                                                            {
                                                                item.phoenixCurrentInventory
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* CASE SIZE */}

                                                    <td className="p-3 text-center">
                                                        {caseSize}
                                                    </td>

                                                    {/* CASE INPUT */}

                                                    <td className="p-3 text-center">

                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="1"
                                                            value={cases}
                                                            onChange={(e) => {

                                                                if (
                                                                    e.target.value === ""
                                                                ) {
                                                                    updateQuantity(
                                                                        item.product._id,
                                                                        ""
                                                                    );

                                                                    return;
                                                                }

                                                                const caseQty =
                                                                    Number(
                                                                        e.target.value
                                                                    );

                                                                updateQuantity(
                                                                    item.product._id,
                                                                    Math.round(
                                                                        caseQty * caseSize
                                                                    )
                                                                );
                                                            }}
                                                            className="w-24 border border-blue-300 rounded-lg p-2 text-center"
                                                        />

                                                    </td>

                                                    {/* UNIT INPUT */}

                                                    <td className="p-3 text-center">

                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={
                                                                item.phoenixCurrentInventory
                                                            }
                                                            value={
                                                                item.requestedQuantity
                                                            }
                                                            onChange={(e) => {

                                                                if (
                                                                    e.target.value === ""
                                                                ) {
                                                                    updateQuantity(
                                                                        item.product._id,
                                                                        ""
                                                                    );

                                                                    return;
                                                                }

                                                                updateQuantity(
                                                                    item.product._id,
                                                                    Math.round(
                                                                        Number(
                                                                            e.target.value
                                                                        )
                                                                    )
                                                                );
                                                            }}
                                                            className={`w-24 border rounded-lg p-2 text-center ${insufficient
                                                                ? "border-red-500 bg-red-50"
                                                                : ""
                                                                }`}
                                                        />

                                                        {insufficient && (
                                                            <p className="text-xs text-red-500 mt-1">
                                                                Not enough inventory
                                                            </p>
                                                        )}

                                                    </td>

                                                    {/* REMOVE */}

                                                    <td className="p-3 text-center">

                                                        <button
                                                            onClick={() =>
                                                                removeProduct(
                                                                    item.product._id
                                                                )
                                                            }
                                                            className="p-2 bg-red-400 hover:bg-red-800 text-red-800 hover:text-white rounded-xl cursor-pointer transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                        </button>

                                                    </td>

                                                </tr>
                                            );
                                        })}

                                    </tbody>

                                </table>

                            </div>

                            {/* =====================================
                    FOOTER
                ===================================== */}

                            <div className="flex justify-between items-center mt-4">

                                <div>
                                    <p>
                                        Products to send:{" "}
                                        {selectedProducts.length}
                                    </p>

                                    <p>
                                        Total Units: {totalUnits}
                                    </p>
                                </div>

                                <div className="flex gap-3">

                                    <button
                                        onClick={() =>
                                            router.push(
                                                "/pages/inventory/load-requests"
                                            )
                                        }
                                        className="px-5 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded-xl"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={createLoadRequest}
                                        disabled={
                                            selectedProducts.length === 0 ||
                                            submitStatus === "loading"
                                        }
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded-xl disabled:opacity-50"
                                    >
                                        Create Load Request
                                    </button>

                                </div>

                            </div>

                        </div>
                    )}

                </div>
            </div>

            {/* ADD PRODUCT */}

            {addProductOpen && (
                <AddForeignTransferProductModal
                    existingProductIds={products.map(
                        (p) => p.product._id
                    )}
                    onAdd={handleAddProduct}
                    onClose={() =>
                        setAddProductOpen(false)
                    }
                />
            )}

            {/* RESULT */}

            {submitStatus && (
                <SubmitResultModal
                    status={submitStatus}
                    message={message}
                    collection="Load Request"
                    onClose={() => {
                        if (submitStatus === "success") {
                            router.replace(
                                "/pages/inventory/load-requests"
                            );
                        }

                        setSubmitStatus(null);
                    }}
                />
            )}

        </>
    );
}


// =====================================================
// ADD PRODUCT MODAL
// =====================================================

function AddForeignTransferProductModal({
    existingProductIds,
    onAdd,
    onClose,
}: {
    existingProductIds: string[];

    onAdd: (
        product: Product,
        phoenixInventory: number
    ) => void;

    onClose: () => void;
}) {

    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {

        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timer);

    }, [search]);

    async function fetchProducts() {
        try {
            setLoading(true);

            const res = await fetch(
                `/api/product-inventory/search?search=${encodeURIComponent(
                    search
                )}&limit=100`,
                {
                    credentials: "include",
                }
            );

            const data = await res.json();

            if (!res.ok) {
                return;
            }

            const items = data.items || [];

            setProducts(
                items.filter((item: any) => {
                    const productId =
                        item.product?._id;

                    return (
                        productId &&
                        !existingProductIds.includes(productId)
                    );
                })
            );

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const groupedProducts = useMemo(() => {
        const sorted = [...products].sort(
            (a, b) => {
                const brandA = a.product?.brand?.name || "No Brand";
                const brandB = b.product?.brand?.name || "No Brand";

                const brandCompare = brandA.localeCompare(brandB, undefined, { sensitivity: "base", });
                if (brandCompare !== 0) {
                    return brandCompare;
                }
                const nameA = a.product?.name || "";
                const nameB = b.product?.name || "";

                return nameA.localeCompare(nameB, undefined, { sensitivity: "base", });
            }
        );
        return sorted.reduce((groups: Record<string, any[]>, item) => {
            const brandName = item.product?.brand?.name || "No Brand";
            if (!groups[brandName]) {
                groups[brandName] = [];
            }
            groups[brandName].push(item);
            return groups;
        },
            {}
        );
    }, [products]);

    return (
        <div onClick={onClose}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div onClick={(e) => e.stopPropagation()}
                className="bg-(--secondary) rounded-xl shadow-xl w-[98vw] md:w-[50vw] h-[95vh] flex flex-col overflow-auto">

                <div className="flex justify-between items-center p-2 mb-4 bg-(--tertiary)">

                    <h2 className="text-xl font-bold">
                        Add Product
                    </h2>

                    <button
                        onClick={onClose}
                        className="p-2 bg-red-500 text-white rounded-xl"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>

                </div>

                <div className="p-2 w-full">
                <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    placeholder="Search product, SKU, UPC..."
                    className="rounded-xl p-2 mb-4 w-full bg-white shadow-xl"
                    autoFocus
                />
                </div>

                <div className="flex-1 md:grid md:grid-cols-2 gap-2 overflow-auto ml-2 mr-2 rounded-xl">

                    {loading && (
                        <p className="p-5 text-center">
                            Loading...
                        </p>
                    )}

                    {!loading &&
                        products.length === 0 && (
                            <p className="p-5 text-center text-gray-500">
                                No products found
                            </p>
                        )}

                    {!loading &&
                        Object.entries(groupedProducts).map(
                            ([brandName, brandProducts]) => (

                                <div
                                    key={brandName}
                                    className="md:col-span-2"
                                >

                                    {/* =====================================
            BRAND HEADER
        ===================================== */}

                                    <div className="sticky top-0 z-10 bg-(--tertiary) rounded-xl p-2 mb-2 shadow-xl">

                                        <div className="flex justify-between items-center">

                                            <h3 className="font-bold text-lg">
                                                {brandName}
                                            </h3>

                                            <span className="text-sm text-gray-600">
                                                {brandProducts.length}{" "}
                                                {brandProducts.length === 1
                                                    ? "product"
                                                    : "products"}
                                            </span>

                                        </div>

                                    </div>

                                    {/* =====================================
            PRODUCTS FOR THIS BRAND
        ===================================== */}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">

                                        {brandProducts.map(
                                            (item: any) => {

                                                const product =
                                                    item.product;

                                                const available =
                                                    Number(
                                                        item.currentInventory
                                                    ) || 0;

                                                return (
                                                    <button
                                                        key={product._id}

                                                        onClick={() =>
                                                            onAdd(
                                                                product,
                                                                available
                                                            )
                                                        }

                                                        disabled={
                                                            available <= 0
                                                        }

                                                        className={`
                    flex
                    min-h-20
                    w-full
                    text-sm
                    md:text-[16px]
                    justify-between
                    items-center
                    p-2
                    rounded-xl
                    bg-white
                    hover:bg-green-200
                    disabled:bg-red-100
                    disabled:cursor-not-allowed
                    disabled:text-gray-400
                    transition-colors
                    cursor-pointer
                  `}
                                                    >

                                                        <div className="w-full">

                                                            {/* PRODUCT NAME */}

                                                            <p className="text-left font-semibold">

                                                                {product.name}{" "}

                                                                {product.weight}

                                                                {product.unit
                                                                    ?.toUpperCase()}

                                                            </p>

                                                            {/* SKU / UPC */}

                                                            <p className="text-sm text-left text-gray-500">

                                                                SKU:{" "}
                                                                {product.sku || "-"}{" "}

                                                                | UPC:{" "}

                                                                {product.upc || "-"}

                                                            </p>

                                                            {/* INVENTORY */}

                                                            <p
                                                                className={`
                        text-right
                        text-sm
                        ${available <= 0
                                                                        ? "text-red-600"
                                                                        : "text-green-600"
                                                                    }
                      `}
                                                            >

                                                                Available:{" "}
                                                                {available}

                                                            </p>

                                                        </div>

                                                    </button>
                                                );
                                            }
                                        )}

                                    </div>

                                </div>
                            )
                        )
                    }

                </div>

            </div>

        </div>
    );
}