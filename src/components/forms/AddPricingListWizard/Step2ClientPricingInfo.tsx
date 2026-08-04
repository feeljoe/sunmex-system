import React, { useState } from "react";
import { useList } from "@/utils/useList";

export function Step2ClientPricingInfo({ form, setForm }: any) {
  const [clientSearch, setClientSearch] = useState("");
  const [chainSearch, setChainSearch] = useState("");

  const { items: clients } = useList("/api/clients", { search: clientSearch });
  const { items: chains } = useList("/api/chains", { search: chainSearch });

  function handlePricingChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev: any) => ({ ...prev, pricing: e.target.value }));
  }

  function addClient(client: any) {
    setForm((prev: any) => {
      if (prev.clientsAssigned.some((c: any) => c._id === client._id)) return prev;
      return {
        ...prev,
        clientsAssigned: [...prev.clientsAssigned, { _id: client._id, clientName: client.clientName, price: "" }],
      };
    });
    setClientSearch("");
  }

  function addChain(chain: any) {
    setForm((prev: any) => {
      if (prev.chainsAssigned.some((c: any) => c._id === chain._id)) return prev;
      return {
        ...prev,
        chainsAssigned: [...prev.chainsAssigned, { _id: chain._id, name: chain.name, price: "" }],
      };
    });
    setChainSearch("");
  }

  function updateItemPrice(id: string, type: "client" | "chain", val: string) {
    const numVal = val === "" ? "" : Number(val);
    const key = type === "client" ? "clientsAssigned" : "chainsAssigned";
    setForm((prev: any) => ({
      ...prev,
      [key]: prev[key].map((item: any) =>
        item._id === id ? { ...item, price: numVal } : item
      ),
    }));
  }

  function removeItem(id: string, type: "client" | "chain") {
    const key = type === "client" ? "clientsAssigned" : "chainsAssigned";
    setForm((prev: any) => ({
      ...prev,
      [key]: prev[key].filter((item: any) => item._id !== id),
    }));
  }

  return (
    <div className="mb-10 flex flex-col h-full pt-5">
      <div className="col-span-full mb-4">
        <label className="text-lg font-medium block mb-2">Global Baseline Price ($)</label>
        <input 
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Default price for items without a specific override"
            value={form.pricing}
            onChange={handlePricingChange}
            className="w-full p-3 rounded-xl border bg-white shadow-sm text-lg" 
            required
        /> 
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 flex-1 overflow-hidden">
        
        {/* CHAINS COLUMN */}
        <div className="flex flex-col bg-gray-50 p-4 rounded-xl border max-h-[45vh]">
          <h3 className="font-semibold text-lg mb-2">Assign Chains</h3>
          <input
            placeholder="Search Chain..."
            value={chainSearch}
            onChange={(e) => setChainSearch(e.target.value)}
            className="bg-white p-3 rounded-xl w-full border shadow-sm mb-2"
          />
          {chainSearch && (
            <div className="flex flex-col w-full bg-white rounded-xl shadow-xl border max-h-40 overflow-auto z-10 mb-2">
              {chains.length === 0 && <div className="p-2 text-gray-500">No chains found</div>}
              {chains.map((chain: any) => {
                const alreadyAdded = form.chainsAssigned.some((c: any) => c._id === chain._id);
                return (
                  <div
                    key={chain._id}
                    onClick={() => !alreadyAdded && addChain(chain)}
                    className={`p-3 cursor-pointer ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
                  >
                    {chain.name}
                  </div>
                );
              })}
            </div>
          )}

          <ul className="space-y-2 overflow-y-auto pr-1">
            {form.chainsAssigned.map((c: any) => (
              <li key={c._id} className="flex justify-between items-center bg-white border shadow-sm p-2 rounded-xl">
                <span className="font-medium truncate pr-2 w-1/2">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    placeholder="Global"
                    value={c.price}
                    onChange={(e) => updateItemPrice(c._id, "chain", e.target.value)}
                    className="w-20 p-1 border rounded-md text-right text-sm"
                  />
                  <button onClick={() => removeItem(c._id, "chain")} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CLIENTS COLUMN */}
        <div className="flex flex-col bg-gray-50 p-4 rounded-xl border max-h-[45vh]">
          <h3 className="font-semibold text-lg mb-2">Assign Clients</h3>
          <input
            placeholder="Search Client..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="bg-white p-3 rounded-xl w-full border shadow-sm mb-2"
          />
          {clientSearch && (
            <div className="flex flex-col w-full bg-white rounded-xl shadow-xl border max-h-40 overflow-auto z-10 mb-2">
              {clients.length === 0 && <div className="p-2 text-gray-500">No clients found</div>}
              {clients.map((client: any) => {
                const alreadyAdded = form.clientsAssigned.some((c: any) => c._id === client._id);
                return (
                  <div
                    key={client._id}
                    onClick={() => !alreadyAdded && addClient(client)}
                    className={`p-3 cursor-pointer ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
                  >
                    {client.clientName}
                  </div>
                );
              })}
            </div>
          )}

          <ul className="space-y-2 overflow-y-auto pr-1">
            {form.clientsAssigned.map((c: any) => (
              <li key={c._id} className="flex justify-between items-center bg-white border shadow-sm p-2 rounded-xl">
                <span className="font-medium text-sm truncate pr-2 w-1/2">{c.clientName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    placeholder="Global"
                    value={c.price}
                    onChange={(e) => updateItemPrice(c._id, "client", e.target.value)}
                    className="w-20 p-1 border rounded-md text-right text-sm"
                  />
                  <button onClick={() => removeItem(c._id, "client")} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}