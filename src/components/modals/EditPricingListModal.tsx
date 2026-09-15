"use client";

import { formatCurrency } from "@/utils/format";
import { useEffect, useRef, useState } from "react";
import AsyncSearchSelect from "../ui/AsyncSearchSelect"; // 🔥 IMPORT NEW COMPONENT

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

  /* ---------------- BASIC INFO ---------------- */
  const [name, setName] = useState(pricingList.name || "");
  const [pricing, setPricing] = useState<number | "">(pricingList.pricing ?? "");

  /* --- ASSIGNMENTS WITH INDIVIDUAL PRICING --- */
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
          if (match) {
            if (endpoint === "/api/products") {
              map[id] = `${match.brand?.name?.toLowerCase() || match.product?.brand?.name?.toLowerCase() || ""} ${match.name?.toLowerCase() || match.product?.name?.toLowerCase() || ""} ${match.weight || match.product?.weight || ""}${match.unit?.toUpperCase() || match.product?.unit?.toUpperCase() || ""}`.trim();
            } else {
              map[id] = match[nameKey] || match.product?.name || match.clientName;
            }
          } else {
            map[id] = "Unknown";
          }
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

  /* -------------- ADD ITEM -------------- */
  const addItem = (item: any, type: "product" | "brand" | "client" | "chain") => {
    let displayName = "";
    if (type === "product") {
      displayName = `${item.name?.toLowerCase() || item.product?.name?.toLowerCase() || ""} ${item.weight || item.product?.weight || ""}${item.unit?.toUpperCase() || item.product?.unit?.toUpperCase() || ""}`.trim();
    } else {
      displayName = item.name || item.clientName || item.product?.name;
    }

    setNameMap((m) => ({ ...m, [item._id]: displayName }));

    if (type === "product") {
      setProducts((prev) => prev.find((p) => p.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
    } else if (type === "brand") {
      setBrands((prev) => prev.find((b) => b.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
    } else if (type === "client"){
      setClientsAssigned((prev) => prev.find((c) => c.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
    } else {
      setChainsAssigned((prev) => prev.find((c) => c.id === item._id) ? prev : [...prev, { id: item._id, price: "" }]);
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
    } else {
      setClientsAssigned((prev) => prev.map((c) => (c.id === id ? { ...c, price: numVal} : c)));
    }
  };

  /* ---------------- SAVE ---------------- */
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;

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
        productPrices, 
        brandPrices,   
        clientsAssigned: clientIds,
        chainsAssigned: chainIds,
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
    <div className="fixed font-mono inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-2xl shadow-2xl w-[98vw] md:w-full max-w-6xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4 p-2 bg-(--tertiary)">
          <h2 className="text-sm lg:text-2xl font-semibold">
            Edit Pricing List
          </h2>
          <button onClick={onClose} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-2 space-y-2">
          {/* BASIC INFO */}
          <div className="grid grid-cols lg:grid-cols-2 gap-2">
            <div>
              <span className="text-sm md:text-[16px] font-medium capitalize">Pricing List Name (current: {pricingList.name?.toLowerCase()})</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white shadow-xl rounded-xl p-2 outline-none font-medium" />
            </div>
            <div>
              <label className="text-sm md:text-[16px] font-medium">Global Pricing (current: {formatCurrency(pricingList.pricing)})</label>
              <input type="number" value={pricing} onChange={(e) => setPricing(e.target.value ? Number(e.target.value) : "")} placeholder="Baseline Price" className="w-full bg-white shadow-xl rounded-xl p-2 outline-none font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* ---------------- BRANDS ---------------- */}
            <div className="space-y-2 shadow-xl bg-blue-100 p-2 rounded-xl text-center">
              <label className="font-semibold text-sm md:text-[16px]">Brands</label>
              <AsyncSearchSelect
                 endpoint="/api/brands"
                 placeholder="Search Brands..."
                 onChange={(item) => addItem(item, "brand")}
                 clearOnSelect={true}
                 getOptionLabel={(opt) => opt.name}
              />
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {brands.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded-xl">
                    <span className="text-sm md:text-[16px] font-medium truncate w-full text-left bg-white rounded-xl p-2 capitalize">{nameMap[b.id]?.toLowerCase()}</span>
                    <div className="flex items-center justify-between w-1/2">
                      <div className="text-sm md:text-[16px] flex gap-2 items-center ml-2 bg-white p-1 rounded-xl">
                      <span className="">$</span>
                      <input type="number" inputMode="decimal" placeholder={String(pricing || "0")} value={b.price} onChange={(e) => updatePrice(b.id, e.target.value, "brand")} className="w-20 p-1 text-right text-sm outline-none" />
                      </div>
                      <button onClick={() => setBrands((prev) => prev.filter((x) => x.id !== b.id))} className="text-red-800 bg-red-400 hover:text-white hover:bg-red-800 transition-colors px-3 py-1 text-xl rounded-full cursor-pointer">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------- PRODUCTS ---------------- */}
            <div className="space-y-2 shadow-xl bg-blue-100 p-2 rounded-xl text-center">
              <label className="font-semibold text-sm md:text-[16px]">Products</label>
              <AsyncSearchSelect
                 endpoint="/api/products"
                 placeholder="Search Products..."
                 onChange={(item) => addItem(item, "product")}
                 clearOnSelect={true}
                 getOptionLabel={(opt) => `${opt.brand?.name?.toLowerCase() || opt.product?.brand?.name?.toLowerCase() || ""} ${opt.name?.toLowerCase() || opt.product?.name?.toLowerCase() || ""} ${opt.weight || opt.product?.weight || ""}${opt.unit?.toUpperCase() || opt.product?.unit?.toUpperCase() || ""}`.trim()}
              />

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl">
                    <span className="text-sm md:text-[16px] font-medium truncate w-full text-left bg-white rounded-xl p-2 capitalize">{nameMap[p.id]?.toLowerCase()}</span>
                    <div className="flex items-center justify-between w-1/2">
                    <div className="text-sm md:text-[16px] flex gap-2 items-center ml-2 bg-white p-1 rounded-xl">
                      <span className="">$</span>
                      <input type="number" inputMode="decimal" placeholder={String(pricing || "0")} value={p.price} onChange={(e) => updatePrice(p.id, e.target.value, "product")} className="w-20 p-1 text-right text-sm outline-none" />
                      </div>
                      <button onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))} className="text-red-800 bg-red-400 hover:text-white hover:bg-red-800 transition-colors px-3 py-1 text-xl rounded-full cursor-pointer">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4">
            {/* ---------------- CHAINS ---------------- */}
            <div className="space-y-2 shadow-xl bg-blue-100 p-2 rounded-xl text-center">
              <label className="font-semibold text-sm md:text-[16px]">Chains</label>
              <AsyncSearchSelect
                 endpoint="/api/chains"
                 placeholder="Search Chains..."
                 onChange={(item) => addItem(item, "chain")}
                 clearOnSelect={true}
                 getOptionLabel={(opt) => opt.name}
              />

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {chainsAssigned.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-xl">
                  <span className="text-sm md:text-[16px] font-medium truncate w-full text-left bg-white rounded-xl p-2 capitalize">{nameMap[c.id]?.toLowerCase()}</span>
                  <div className="flex items-center justify-between w-1/2">
                  <div className="text-sm md:text-[16px] flex gap-2 items-center ml-2 bg-white p-1 rounded-xl">
                      <span className="">$</span>
                      <input type="number" inputMode="decimal" placeholder={String(pricing || "0")} value={c.price} onChange={(e) => updatePrice(c.id, e.target.value, "chain")} className="w-20 p-1 text-right text-sm outline-none" />
                      </div>
                      <button onClick={() => setChainsAssigned((prev) => prev.filter((x) => x.id !== c.id))} className="text-red-800 bg-red-400 hover:text-white hover:bg-red-800 transition-colors px-3 py-1 text-xl rounded-full cursor-pointer">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------- CLIENTS ---------------- */}
            <div className="space-y-2 shadow-xl bg-blue-100 p-2 rounded-xl text-center">
              <label className="font-semibold text-lg">Clients</label>
              <AsyncSearchSelect
                 endpoint="/api/clients"
                 placeholder="Search Clients..."
                 onChange={(item) => addItem(item, "client")}
                 clearOnSelect={true}
                 getOptionLabel={(opt) => opt.clientName}
              />

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {clientsAssigned.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-xl">
                  <span className="text-sm md:text-[16px] font-medium truncate w-full text-left bg-white rounded-xl p-2 capitalize">{nameMap[c.id]?.toLowerCase()}</span>
                  <div className="flex items-center justify-between w-1/2">
                  <div className="text-sm md:text-[16px] flex gap-2 items-center ml-2 bg-white p-1 rounded-xl">
                      <span className="">$</span>
                      <input type="number" inputMode="decimal" placeholder={String(pricing || "0")} value={c.price} onChange={(e) => updatePrice(c.id, e.target.value, "client")} className="w-20 p-1 text-right text-sm outline-none" />
                      </div>
                      <button onClick={() => setClientsAssigned((prev) => prev.filter((x) => x.id !== c.id))} className="text-red-800 bg-red-400 hover:text-white hover:bg-red-800 transition-colors px-3 py-1 text-xl rounded-full cursor-pointer">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- ACTIONS ---------------- */}
        <div className="flex justify-between p-2">
          <button onClick={onClose} className="p-2 bg-gray-300 text-gray-700 hover:text-white rounded-xl hover:bg-gray-700 cursor-pointer transition-colors font-bold shadow-xl">
            Cancel
          </button>
          <button onClick={save} className="p-2 bg-blue-400 text-blue-800 hover:text-white rounded-xl shadow-xl hover:bg-blue-800 cursor-pointer transition-colors font-bold">
            Save
          </button>
        </div>

      </div>
    </div>
  );
}