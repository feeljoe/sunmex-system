// components/PreorderForm.tsx
"use client";

import Client from "@/models/Client";
import ProductInventory from "@/models/ProductInventory";
import Route from "@/models/Route";
import { useEffect, useState } from "react";
import { getServerSession } from "next-auth";

export default function PreorderForm() {
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  //useEffect()
  const getClients = async () => {
    const session = await getServerSession();
  // Get products with current inventory
  const products = await ProductInventory.find({ currentInventory: { $gt: 0 } }).populate("product");
    setInventory(products);
  // Get clients user can pre-order for
  let clients = [];
  if (session?.user.role === "admin") {
    clients = await Client.find({});
    setClients(clients);
  } else if (session?.user.role === "vendor") {
    const route = await Route.findOne({ user: session?.user.id }).populate("clients");
    clients = route?.clients || [];
  }

  }

  const addProduct = (product: any) => {
    const exists = selectedProducts.find(p => p._id === product._id);
    if (exists) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p._id === product._id
            ? { ...p, qty: Math.min(p.qty + 1, product.currentInventory) }
            : p
        )
      );
    } else {
      setSelectedProducts([...selectedProducts, { ...product, qty: 1 }]);
    }
  };

  const removeProduct = (_id: string) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== _id));
  };

  const handleQtyChange = (_id: string, qty: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p._id === _id
          ? { ...p, qty: Math.min(Math.max(qty, 1), p.currentInventory) }
          : p
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedClient || selectedProducts.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: selectedClient,
          products: selectedProducts.map(p => ({ id: p._id, quantity: p.qty })),
        }),
      });
      if (!res.ok) throw new Error("Error creating preorder");
      alert("Preorder created successfully!");
      setSelectedClient("");
      setSelectedProducts([]);
    } catch (err) {
      console.error(err);
      alert("Error creating preorder");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={selectedClient}
        onChange={e => setSelectedClient(e.target.value)}
        className="border p-2 rounded w-full"
      >
        <option value="">Select Client</option>
        {clients.map((c: any) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>

      <div>
        <h2 className="font-semibold mb-2">Products</h2>
        {inventory.map((p: any) => (
          <div key={p._id} className="flex items-center gap-2 mb-1">
            <span className="flex-1">{p.product.name} ({p.currentInventory})</span>
            <button onClick={() => addProduct(p)} className="px-2 py-1 bg-blue-500 text-white rounded">
              Add
            </button>
          </div>
        ))}
      </div>

      {selectedProducts.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">Selected Products</h2>
          {selectedProducts.map(p => (
            <div key={p._id} className="flex items-center gap-2 mb-1">
              <span className="flex-1">{p.product.name}</span>
              <input
                type="number"
                min={1}
                max={p.currentInventory}
                value={p.qty}
                onChange={e => handleQtyChange(p._id, Number(e.target.value))}
                className="w-20 border rounded p-1"
              />
              <button onClick={() => removeProduct(p._id)} className="px-2 py-1 bg-red-500 text-white rounded">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-green-500 text-white px-4 py-2 rounded mt-4"
      >
        {submitting ? "Submitting..." : "Submit Preorder"}
      </button>
    </div>
  );
}
