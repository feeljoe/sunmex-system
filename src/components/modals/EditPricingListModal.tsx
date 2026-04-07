"use client";

import { useEffect, useRef, useState } from "react";

type ProductMode = "products" | "brands";
type ClientMode = "clients" | "chains";

interface Props {
  open: boolean;
  pricingList: any;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPricingListModal({
  open,
  pricingList,
  onClose,
  onSaved,
}: Props) {
const normalizeIds = (arr: any[] = []) =>
    arr.map((x) => (typeof x === "string" ? x : x._id)); 

 /* ----------- TYPE OF PRICING LIST ------------ */
 const [productMode] = useState<ProductMode>(
    pricingList.brandIds?.length > 0 ? "brands" : "products"
  );
  const [clientMode] = useState<ClientMode>(
    pricingList.chainsAssigned?.length > 0 ? "chains" : "clients"
  );

  /* ---------------- BASIC INFO ---------------- */
  const [name, setName] = useState(pricingList.name);
  const [pricing, setPricing] = useState(pricingList.pricing);

  /* ---------------- ASSIGNMENTS ---------------- */
  const [productIds, setProductIds] = useState<string[]>(
    normalizeIds(pricingList.productIds)
  );
  const [brandIds, setBrandIds] = useState<string[]>(
    normalizeIds(pricingList.brandIds)
  );
  const [clientsAssigned, setClientsAssigned] = useState<string[]>(
    normalizeIds(pricingList.clientsAssigned)
  );
  const [chainsAssigned, setChainsAssigned] = useState<string[]>(
    normalizeIds(pricingList.chainsAssigned)
  );

  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  /* ---------------- SEARCH STATES ---------------- */
  const [searchProduct, setSearchProduct] = useState("");
  const [searchClient, setSearchClient] = useState("");

  const [productResults, setProductResults] = useState<any[]>([]);
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);

  const savingRef = useRef(false);

  /* --------------- INITIAL NAME MAP --------------- */
  useEffect(() => {
    const hydrateMissingIds = async () => {
    const map: Record<string, string> = { ...nameMap };

    const fetchMissing = async (
        missingIds: string[],
        endpoint: string,
        nameKey: string,
    ) => {
        for(const id of missingIds){
            // Use search API to fetch the single item by id
          const res = await fetch(`${endpoint}?search=${id}`);
          const data = await res.json();
          const items = data.items || data.products || data.clients || data.brands || data.chains || [];
          const match = items.find((it: any) => it._id === id);
          if (match) map[id] = match[nameKey] || match.product?.name || match.clientName;
          else map[id] = "Unknown";
        }
    }

    // PRODUCTS / BRANDS
    if(productIds.length > 0 && productMode === "products") {
        const missingIds = productIds.filter((id) => !map[id]);
        if(missingIds.length > 0) {
            await fetchMissing(missingIds, "/api/products", "name");
        }
    }
    if (brandIds.length > 0 && productMode === "brands") {
        const missingIds = brandIds.filter((id) => !map[id]);
        if (missingIds.length > 0) {
          await fetchMissing(missingIds, "/api/brands", "name");
        }
      }

      // CLIENTS / CHAINS
      if (clientsAssigned.length > 0 && clientMode === "clients") {
        const missingIds = clientsAssigned.filter((id) => !map[id]);
        if (missingIds.length > 0) {
          await fetchMissing(missingIds, "/api/clients", "clientName");
        }
      }

      if (chainsAssigned.length > 0 && clientMode === "chains") {
        const missingIds = chainsAssigned.filter((id) => !map[id]);
        if (missingIds.length > 0) {
          await fetchMissing(missingIds, "/api/chains", "name");
        }
      }
        setNameMap(map);
    };

    hydrateMissingIds();
  }, []);

  /* ---------------- SEARCH EFFECT ---------------- */
  useEffect(() => {
    if (!searchProduct) {
      setProductResults([]);
      return;
    }
    const endpoint = productMode === "products"
          ? "/api/products"
          : "/api/brands";

    const timeout = setTimeout(async () => {
      setProductLoading(true);
      const res = await fetch(`${endpoint}?search=${searchProduct}`);
      const data = await res.json();
      setProductResults(data.items || []);
      setProductLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchProduct]);
  useEffect(() => {
    if (!searchClient) {
      setClientResults([]);
      return;
    }
    const endpoint = clientMode === "clients"
          ? "/api/clients"
          : "/api/chains";

    const timeout = setTimeout(async () => {
      setClientLoading(true);
      const res = await fetch(`${endpoint}?search=${searchClient}`);
      const data = await res.json();
      setClientResults(data.items || []);
      setClientLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchClient]);

  /* -------------- ADD ITEM -------------- */
  const addItem = (item: any) => {
    setNameMap((m) => ({
        ...m,
        [item._id]: item.name || item.clientName || item.product?.name,
    }));

    if(searchProduct){
        productMode === "products"
        ? setProductIds((p) => (p.includes(item._id) ? p : [...p, item._id]))
        : setBrandIds((b) => b.includes(item._id) ? b : [...b, item._id]);
        setSearchProduct("");
        setProductResults([]);
    } else {
        clientMode === "clients"
        ? setClientsAssigned((c) => 
            c.includes(item._id) ? c : [...c, item._id]
          )
        : setChainsAssigned((c) =>
            c.includes(item._id) ? c : [...c, item._id]
        );
        setSearchClient("");
        setClientResults([]);
    }
  };

  /* ---------------- SAVE ---------------- */
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;

    await fetch(`/api/pricingLists/${pricingList._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        pricing,
        productIds,
        brandIds,
        clientsAssigned,
        chainsAssigned,
      }),
    });

    savingRef.current = false;
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Edit Pricing List
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* BASIC INFO */}
        <div className="grid grid-cols lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white shadow-xl rounded-xl p-3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Pricing</label>
            <input
              type="number"
              value={pricing}
              onChange={(e) => setPricing(Number(e.target.value))}
              className="w-full bg-white shadow-xl rounded-xl p-3"
            />
          </div>
        </div>

        {/* ---------------- PRODUCTS / BRANDS ---------------- */}
        <div className="space-y-2">
          <label className="font-medium">
            {productMode === "products" ? "Products" : "Brands"}
          </label>
          <input
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            placeholder={`Search ${productMode}`}
            className="w-full bg-white shadow-xl rounded-xl p-3"
          />
          <div className="bg-white rounded-xl shadow max-h-60 overflow-y-auto">
            {productLoading && <p className="p-3 text-sm text-gray-500">Loading products...</p>}
            {!productLoading && productResults.length === 0 && searchProduct && (
              <p className="p-3 text-sm text-gray-500">No results found</p>
            )}
            {!productLoading &&
              productResults.map((item) => (
                <button
                  key={item._id}
                  className="w-full text-left p-3 hover:bg-gray-100"
                  onClick={() => addItem(item)}
                >
                  {item.name || item.product?.name}
                </button>
              ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(productMode === "products" ? productIds : brandIds).map((id) => (
              <span
                key={id}
                className="bg-blue-100 text-blue-500 px-3 py-1 shadow-xl rounded-full flex items-center gap-2"
              >
                {nameMap[id]}
                <button
                  onClick={() => {
                    productMode === "products"
                      ? setProductIds((p) => p.filter((x) => x !== id))
                      : setBrandIds((p) => p.filter((x) => x !== id));
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ---------------- CLIENTS / CHAINS ---------------- */}
        <div className="space-y-2 mt-4">
          <label className="font-medium">
            {clientMode === "clients" ? "Clients" : "Chains"}
          </label>
          <input
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            placeholder={`Search ${clientMode}`}
            className="w-full bg-white shadow-xl rounded-xl p-3"
          />
          <div className="bg-white rounded-xl shadow max-h-60 overflow-y-auto">
            {clientLoading && <p className="p-3 text-sm text-gray-500">Loading...</p>}
            {!clientLoading && clientResults.length === 0 && searchClient && (
              <p className="p-3 text-sm text-gray-500">No results found</p>
            )}
            {!clientLoading &&
              clientResults.map((item) => (
                <button
                  key={item._id}
                  className="w-full text-left p-3 hover:bg-gray-100"
                  onClick={() => addItem(item)}
                >
                  {item.name || item.clientName}
                </button>
              ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(clientMode === "clients" ? clientsAssigned : chainsAssigned).map(
              (id) => (
                <span
                  key={id}
                  className="bg-blue-100 text-blue-500 px-3 py-1 rounded-full shadow-xl flex items-center gap-2"
                >
                  {nameMap[id]}
                  <button
                    onClick={() => {
                      clientMode === "clients"
                        ? setClientsAssigned((c) => c.filter((x) => x !== id))
                        : setChainsAssigned((c) => c.filter((x) => x !== id));
                    }}
                  >
                    ✕
                  </button>
                </span>
              )
            )}
          </div>
        </div>

        {/* ---------------- ACTIONS ---------------- */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
