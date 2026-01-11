"use client";

import { useEffect, useState } from "react";

type Client = {
  _id: string;
  clientName: string;
};

export default function Step1Client({
  routeId,
  form,
  setForm,
  onNext,
}: {
  routeId: string;
  form: any;
  setForm: (v: any) => void;
  onNext: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      const res = await fetch(`/api/routes/${routeId}/clients`);
      const data = await res.json();
      setClients(data);
      setLoading(false);
    }
    loadClients();
  }, [routeId]);

  if (loading) {
    return <p>Loading clients...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Select Client</h2>

      <select
        value={form.clientId}
        onChange={(e) =>
          setForm((prev: any) => ({
            ...prev,
            clientId: e.target.value,
          }))
        }
        className="w-full p-3 border rounded-lg"
      >
        <option value="">-- Select Client --</option>
        {clients.map((client) => (
          <option key={client._id} value={client._id}>
            {client.clientName}
          </option>
        ))}
      </select>
      <div className="flex justify-end items-center">
      <button
            onClick={onNext}
            className="bg-blue-500 text-xl text-white px-5 py-3 cursor-pointer"
        > 
            Next
        </button>
      </div>
    </div>
  );
}
