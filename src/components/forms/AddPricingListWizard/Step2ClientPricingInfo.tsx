import React, { useEffect, useState } from "react";
import { useList } from "@/utils/useList";

// Step2ClietnPricingInfo.tsx
type Client = {
    _id: string;
    clientName: string;
};

type Chain = {
    _id: string;
    name: string;
};

export function Step2ClientPricingInfo({ form, setForm }: any) {const isChain = form.appliesToClients === "chain";
    const [clientSearch, setClientSearch] = useState("");
    const [chainSearch, setChainSearch] = useState("");

    const {items: clients} = useList<Client>("/api/clients", {
        search: clientSearch,
    });
    const {items:chains} = useList<Chain>("/api/chains", {
        search: chainSearch,
    });

    const [clientMap, setClientMap] = useState<Record<string, Client>>({});
    const [chainMap, setChainMap] = useState<Record<string, Chain>>({});


      function toggleAppliesTo(){
        setForm((prev: any) =>({
            ...prev,
            appliesToClients: prev.appliesToClients === "chain"? "client" : "chain",
            clientsAssigned:[],
            chainsAssigned:[],
        }));
      }

      function addItem(item: Client | Chain, type: "client" | "chain") {
    setForm((prev: any) => {
      const key = `${type}sAssigned`;
      if (prev[key].includes(item._id)) return prev;
      return {
        ...prev,
        [key]: [...prev[key], item._id],
      };
    });
    if (type === "client") {
        setClientMap((prev) => ({ ...prev, [item._id]: item as Client }));
    } else {
        setChainMap((prev) => ({ ...prev, [item._id]: item as Chain }));
    }
    setClientSearch("");
    setChainSearch("");
  }

  function removeItem(id: string, type: "client" | "chain") {
    setForm((prev: any) => ({
      ...prev,
      [`${type}sAssigned`]: prev[`${type}sAssigned`].filter(
        (i: string) => i !== id
      ),
    }));
  }

  function handlePricingChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev: any) => ({ ...prev, pricing: e.target.value }));
  }

    return (
        <div className='grid grid-cols gap-3 pt-5'>
            <input 
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="Price"
                value={form.pricing}
                onChange={handlePricingChange}
                className="w-full h-15 p-3 rounded bg-white shadow-xl" 
                required
            /> 
            <label className="flex items-center justify-center w-full h-15 gap-5 text-xl">Applies to Chains?
                <input type="checkbox" checked={isChain} onChange={toggleAppliesTo} className="w-8 h-8"/>
            </label>
            {/* CLIENT MODE */}
      {!isChain && (
        <>
          <input
            placeholder="Search client..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="w-full h-15 p-3 rounded bg-white shadow"
          />
          {clientSearch && (
                <div className="flex flex-col w-full bg-white rounded shadow-xl max-h-60 overflow-auto z-10">
                    {clients.length === 0 && (
                        <div className="p-2 text-gray-500">No clients found</div>
                    )}
                    {clients.map((client) => {
                        const alreadyAdded = form.clientsAssigned.includes(client._id);
                        return(
                            <div
                                key={client._id}
                                onClick={() => {
                                !alreadyAdded && addItem(client, "client");
                                }}
                                className={`p-2 hover:bg-gray-100 cursor-pointer ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
                            >
                                <div className="font-medium">{client.clientName}</div>
                            </div>
                        );
                    })}
                </div>
            )}

          <ul className="space-y-2">
            {form.clientsAssigned.map((id: string) => (
                <li
                  key={id}
                  className="flex justify-between items-center bg-gray-100 p-3 rounded"
                >
                  {clientMap[id]?.clientName || "unknown client"}
                  <button
                    onClick={() => removeItem(id, "client")}
                    className="bg-red-500 text-white px-2 py-2 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </li>
            ))}
          </ul>
        </>
      )}

      {/* CHAIN MODE */}
      {isChain && (
        <>
          <input
            placeholder="Search chain..."
            value={chainSearch}
            onChange={(e) => setChainSearch(e.target.value)}
            className="w-full h-15 p-3 rounded bg-white shadow"
          />

            {chainSearch && (
                <div className="flex flex-col w-full bg-white rounded shadow-xl max-h-60 overflow-auto z-10">
                    {chains.length === 0 && (
                        <div className="p-2 text-gray-500">No chains found</div>
                    )}
                    {chains.map(chain => {
                        const alreadyAdded = form.chainsAssigned.includes(chain._id);
                        return(
                            <div
                                key={chain._id}
                                onClick={() => {
                                !alreadyAdded && addItem(chain, "chain");
                                }}
                                className={`p-2 hover:bg-gray-100 cursor-pointer ${alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
                            >
                                <div className="font-medium">{chain.name}</div>
                            </div>
                        );
                    })}
                </div>
            )}

          <ul className="space-y-2">
            {form.chainsAssigned.map((id: string) => (
                <li
                  key={id}
                  className="flex justify-between items-center bg-gray-100 p-3 rounded"
                >
                  {chainMap[id]?.name || "Unknown Chain"}
                  <button
                    onClick={() => removeItem(id, "chain")}
                    className="bg-red-500 text-white px-2 py-2 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}