"use client";

import { useEffect, useRef, useState } from "react";

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

  const [clientMode, setClientMode] = useState<ClientMode>(
    pricingList.chainsAssigned?.length > 0 ? "chains" : "clients"
  );

  /* ---------------- BASIC INFO ---------------- */
  const [name, setName] = useState(pricingList.name || "");
  const [pricing, setPricing] = useState<number | "">(pricingList.pricing ?? "");

  /* --- ASSIGNMENTS WITH INDIVIDUAL PRICING --- */
  // We store an array of objects: { id, price } where price is "" if relying on global
  const [products, setProducts] = useState<{ id: string; price: number | "" }[]>(() => {
    const ids = normalizeIds(pricingList.productIds);
    return ids.map((id) => {
      const custom = pricingList.productPrices?.find((p: any) => 
        (typeof p.product === 'string' ? p.product : p.product?._id) === id
      );
      return { id, price: custom ? custom.price : "" };
    });
  });

  const [brands, setBrands] = useState<{ id: string; price: number | "" }[]>(() => {
    const ids = normalizeIds(pricingList.brandIds);
    return ids.map((id) => {
      const custom = pricingList.brandPrices?.find((p: any) => 
        (typeof p.brand === 'string' ? p.brand : p.brand?._id) === id
      );
      return { id, price: custom ? custom.price : "" };
    });
  });

  const [clientsAssigned, setClientsAssigned] = useState<{ id: string; price: number | "" }[]>(() => {
    const ids = normalizeIds(pricingList.clientsAssigned);
    return ids.map((id) => {
      const custom = pricingList.clientPrices?.find((p: any) => 
        (typeof p.client === 'string' ? p.client : p.client?._id) === id);
      return { id, price: custom ? custom.price : "" };
    });
  });

  const [chainsAssigned, setChainsAssigned] = useState<{ id: string; price: number | "" }[]>(() => {
    const ids = normalizeIds(pricingList.chainsAssigned);
    return ids.map((id) => {
      const custom = pricingList.chainPrices?.find((p: any) => 
        (typeof p.chain === 'string' ? p.chain : p.chain?._id) === id);
      return { id, price: custom ? custom.price : "" };
    });
  });

  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  /* ---------------- SEARCH STATES ---------------- */
  const [searchProduct, setSearchProduct] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchChain, setSearchChain] = useState("");

  const [productResults, setProductResults] = useState<any[]>([]);
  const [brandResults, setBrandResults] = useState<any[]>([]);
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [chainResults, setChainResults] = useState<any[]>([]);

  const savingRef = useRef(false);

  /* --------------- INITIAL NAME MAP --------------- */
  useEffect(() => {
    const hydrateMissingIds = async () => {
      const map: Record<string, string> = { ...nameMap };

      const fetchMissing = async (missingIds: string[], endpoint: string, nameKey: string) => {
        for (const id of missingIds) {
          const res = await fetch(`${endpoint}?search=${id}`);
          const data = await res.json();
          const items = data.items || data.products || data.clients || data.brands || data.chains || [];
          const match = items.find((it: any) => it._id === id);
          if (match) map[id] = match[nameKey] || match.product?.name || match.clientName;
          else map[id] = "Unknown";
        }
      };

      if (products.length > 0) {
        const missingIds = products.map((p) => p.id).filter((id) => !map[id]);
        if (missingIds.length > 0) await fetchMissing(missingIds, "/api/products", "name");
      }
      if (brands.length > 0) {
        const missingIds = brands.map((b) => b.id).filter((id) => !map[id]);
        if (missingIds.length > 0) await fetchMissing(missingIds, "/api/brands", "name");
      }
      if (chainsAssigned.length > 0) {
        const missingIds = chainsAssigned.map((ch) => ch.id).filter((id) => !map[id]);
        if (missingIds.length > 0) await fetchMissing(missingIds, "/api/chains", "name");
      }
      if (clientsAssigned.length > 0) {
        const missingIds = clientsAssigned.map((c) => c.id).filter((id) => !map[id]);
        if (missingIds.length > 0) await fetchMissing(missingIds, "/api/clients", "clientName");
      }
      setNameMap(map);
    };

    hydrateMissingIds();
  }, []);

  /* ---------------- SEARCH EFFECTS ---------------- */
  useEffect(() => {
    if (!searchProduct) return setProductResults([]);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/products?search=${searchProduct}`);
      const data = await res.json();
      setProductResults(data.items || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchProduct]);

  useEffect(() => {
    if (!searchBrand) return setBrandResults([]);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/brands?search=${searchBrand}`);
      const data = await res.json();
      setBrandResults(data.items || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchBrand]);

  useEffect(() => {
    if (!searchClient) return setClientResults([]);
    const endpoint = "/api/clients";
    const timeout = setTimeout(async () => {
      const res = await fetch(`${endpoint}?search=${searchClient}`);
      const data = await res.json();
      setClientResults(data.items || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchClient]);

  useEffect(() => {
    if (!searchChain) return setChainResults([]);
    const endpoint = "/api/chains";
    const timeout = setTimeout(async () => {
      const res = await fetch(`${endpoint}?search=${searchChain}`);
      const data = await res.json();
      setChainResults(data.items || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchChain]);
  /* -------------- ADD ITEM -------------- */
  const addItem = (item: any, type: "product" | "brand" | "client" | "chain") => {
    setNameMap((m) => ({ ...m, [item._id]: item.name || item.clientName || item.product?.name }));

    if (type === "product") {
      setProducts((prev) => prev.find((p) => p.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
      setSearchProduct("");
    } else if (type === "brand") {
      setBrands((prev) => prev.find((b) => b.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
      setSearchBrand("");
    } else if (type === "client"){
      setClientsAssigned((c) => (c.includes(item._id) ? c : [...c, item._id]));
      setSearchClient("");
    } else {
      setChainsAssigned((c) => (c.includes(item._id) ? c : [...c, item._id]));
      setSearchChain("");
    }
  };

  /* -------------- UPDATE SPECIFIC PRICE -------------- */
  const updatePrice = (id: string, val: string, type: "product" | "brand" | "chain" | "client") => {
    const numVal = val === "" ? "" : Number(val);
    if (type === "product") {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price: numVal } : p)));
    } else if (type === "brand") {
      setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, price: numVal } : b)));
    } else if (type === "chain") {
      setChainsAssigned((prev) => prev.map((ch) => (ch.id === id ? { ...ch, price: numVal} : ch)));
    }else {
      setClientsAssigned((prev) => prev.map((c) => (c.id === id ? { ...c, price: numVal} : c)));
    }
  };

  /* ---------------- SAVE ---------------- */
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;

    // Separate pure IDs (for backwards compatibility) and specific overrides
    const productIds = products.map((p) => p.id);
    const productPrices = products.filter((p) => p.price !== "").map((p) => ({ product: p.id, price: p.price }));
    
    const brandIds = brands.map((b) => b.id);
    const brandPrices = brands.filter((b) => b.price !== "").map((b) => ({ brand: b.id, price: b.price }));

    const clientIds = clientsAssigned.map((c) => c.id);
    const clientPrices = clientsAssigned.filter((c) => c.price !== "").map((c) => ({ client: c.id, price: c.price }));
    const chainIds = chainsAssigned.map((c) => c.id);
    const chainPrices = chainsAssigned.filter((c) => c.price !== "").map((c) => ({ chain: c.id, price: c.price }));

    await fetch(`/api/pricingLists/${pricingList._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        pricing: Number(pricing) || 0,
        productIds,
        brandIds,
        productPrices, // Specific overrides
        brandPrices,   // Specific overrides
        clientsAssigned,
        chainsAssigned,
        clientPrices,
        chainPrices,
      }),
    });

    savingRef.current = false;
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-4xl p-6 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Pricing List</h2>
          <button onClick={onClose} className="text-2xl">✕</button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-6">
          {/* BASIC INFO */}
          <div className="grid grid-cols lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white shadow-sm rounded-xl p-3 border"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Global Pricing ($)</label>
              <input
                type="number"
                value={pricing}
                onChange={(e) => setPricing(e.target.value ? Number(e.target.value) : "")}
                placeholder="Baseline Price"
                className="w-full bg-white shadow-sm rounded-xl p-3 border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------------- BRANDS ---------------- */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-xl border">
              <label className="font-semibold text-lg">Brands</label>
              <input
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                placeholder="Search Brands..."
                className="w-full bg-white shadow-sm rounded-xl p-3 border"
              />
              {searchBrand && brandResults.length > 0 && (
                <div className="bg-white rounded-xl shadow border max-h-40 overflow-y-auto mb-2">
                  {brandResults.map((item) => (
                    <button key={item._id} className="w-full text-left p-3 hover:bg-gray-100" onClick={() => addItem(item, "brand")}>
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {brands.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
                    <span className="font-medium truncate w-1/2">{nameMap[b.id]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        placeholder={String(pricing || "0")}
                        value={b.price}
                        onChange={(e) => updatePrice(b.id, e.target.value, "brand")}
                        className="w-20 p-1 border rounded-md text-right text-sm"
                      />
                      <button onClick={() => setBrands((prev) => prev.filter((x) => x.id !== b.id))} className="text-red-500 hover:text-red-700 ml-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------- PRODUCTS ---------------- */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-xl border">
              <label className="font-semibold text-lg">Products</label>
              <input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Search Products..."
                className="w-full bg-white shadow-sm rounded-xl p-3 border"
              />
              {searchProduct && productResults.length > 0 && (
                <div className="bg-white rounded-xl shadow border max-h-40 overflow-y-auto mb-2">
                  {productResults.map((item) => (
                    <button key={item._id} className="w-full text-left p-3 hover:bg-gray-100" onClick={() => addItem(item, "product")}>
                      {item.name || item.product?.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
                    <span className="font-medium truncate w-1/2">{nameMap[p.id]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        placeholder={String(pricing || "0")}
                        value={p.price}
                        onChange={(e) => updatePrice(p.id, e.target.value, "product")}
                        className="w-20 p-1 border rounded-md text-right text-sm"
                      />
                      <button onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))} className="text-red-500 hover:text-red-700 ml-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  {/* ---------------- CHAINS ---------------- */}
  <div className="space-y-2 bg-gray-50 p-4 rounded-xl border">
    <label className="font-semibold text-lg">Chains</label>
    <input
      value={searchChain}
      onChange={(e) => setSearchChain(e.target.value)}
      placeholder="Search Chains..."
      className="w-full bg-white shadow-sm rounded-xl p-3 border"
    />
    {searchChain && chainResults.length > 0 && (
      <div className="bg-white rounded-xl shadow border max-h-40 overflow-y-auto mb-2">
        {chainResults.map((item) => (
          <button key={item._id} className="w-full text-left p-3 hover:bg-gray-100" onClick={() => addItem(item, "chain")}>
            {item.name}
          </button>
        ))}
      </div>
    )}
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {chainsAssigned.map((c) => (
        <div key={c.id} className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
          <span className="font-medium truncate w-1/2">{nameMap[c.id]}</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              placeholder={String(pricing || "0")}
              value={c.price}
              onChange={(e) => updatePrice(c.id, e.target.value, "chain")} // Ensure updatePrice handles "client" and "chain" types!
              className="w-20 p-1 border rounded-md text-right text-sm"
            />
            <button onClick={() => setChainsAssigned((prev) => prev.filter((x) => x.id !== c.id))} className="text-red-500 hover:text-red-700 ml-2">✕</button>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* ---------------- CLIENTS ---------------- */}
  <div className="space-y-2 bg-gray-50 p-4 rounded-xl border">
    <label className="font-semibold text-lg">Clients</label>
    <input
      value={searchClient}
      onChange={(e) => setSearchClient(e.target.value)}
      placeholder="Search Clients..."
      className="w-full bg-white shadow-sm rounded-xl p-3 border"
    />
    {searchClient && clientResults.length > 0 && (
      <div className="bg-white rounded-xl shadow border max-h-40 overflow-y-auto mb-2">
        {clientResults.map((item) => (
          <button key={item._id} className="w-full text-left p-3 hover:bg-gray-100" onClick={() => addItem(item, "client")}>
            {item.clientName}
          </button>
        ))}
      </div>
    )}
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {clientsAssigned.map((c) => (
        <div key={c.id} className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
          <span className="font-medium truncate w-1/2">{nameMap[c.id]}</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              placeholder={String(pricing || "0")}
              value={c.price}
              onChange={(e) => updatePrice(c.id, e.target.value, "client")}
              className="w-20 p-1 border rounded-md text-right text-sm"
            />
            <button onClick={() => setClientsAssigned((prev) => prev.filter((x) => x.id !== c.id))} className="text-red-500 hover:text-red-700 ml-2">✕</button>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
        </div>

        {/* ---------------- ACTIONS ---------------- */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} className="px-6 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700">
            Save
          </button>
        </div>

      </div>
    </div>
  );
}