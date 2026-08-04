import { useList } from "@/utils/useList";
import React, { useState } from "react";

export function Step1BasicInfo({ form, setForm }: any) {
  const [brandSearch, setBrandSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { items: brands } = useList("/api/brands", { search: brandSearch });
  const { items: products } = useList("/api/products", { search: productSearch });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  }

  function addProduct(product: any) {
    setForm((prev: any) => {
      if (prev.products.some((p: any) => p._id === product._id)) return prev;
      return {
        ...prev,
        products: [
          ...prev.products,
          {
            _id: product._id,
            name: product.name,
            brand: product.brand?.name,
            sku: product.sku,
            weight: product.weight,
            uom: product.unit,
            caseSize: product.caseSize,
            price: "", // NEW: Setup specific override
          },
        ],
      };
    });
    setProductSearch("");
  }

  function addBrand(brand: any) {
    setForm((prev: any) => {
      if (prev.brands.some((b: any) => b._id === brand._id)) return prev;
      return {
        ...prev,
        brands: [
          ...prev.brands,
          {
            _id: brand._id,
            name: brand.name,
            price: "", // NEW: Setup specific override
          },
        ],
      };
    });
    setBrandSearch("");
  }

  function updateItemPrice(id: string, type: "product" | "brand", val: string) {
    const numVal = val === "" ? "" : Number(val);
    setForm((prev: any) => ({
      ...prev,
      [`${type}s`]: prev[`${type}s`].map((item: any) =>
        item._id === id ? { ...item, price: numVal } : item
      ),
    }));
  }

  function removeItem(id: string, type: "product" | "brand") {
    setForm((prev: any) => ({
      ...prev,
      [`${type}s`]: prev[`${type}s`].filter((pb: any) => pb._id !== id),
    }));
  }

  return (
    <div className="mb-10 flex flex-col h-full">
      <div className="pt-5 space-y-2">
        <label className="text-xl font-medium">Pricing List Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full bg-white p-3 rounded-xl shadow-sm border text-gray-700 h-12"
          placeholder="e.g., Summer Discount Tier 1"
          required
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 flex-1 overflow-hidden">
        
        {/* BRANDS COLUMN */}
        <div className="flex flex-col bg-gray-50 p-4 rounded-xl border max-h-[45vh]">
          <h3 className="font-semibold text-lg mb-2">Assign Brands</h3>
          <input
            placeholder="Search Brand..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="bg-white p-3 rounded-xl w-full border shadow-sm mb-2"
          />
          {brandSearch && (
            <div className="flex flex-col w-full bg-white rounded-xl shadow-xl border max-h-40 overflow-auto z-10 mb-2">
              {brands.length === 0 && <div className="p-2 text-gray-500">No brands found</div>}
              {brands.map((brand: any) => {
                const alreadyAdded = form.brands.some((b: any) => b._id === brand._id);
                return (
                  <div
                    key={brand._id}
                    onClick={() => !alreadyAdded && addBrand(brand)}
                    className={`p-3 cursor-pointer ${
                      alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"
                    }`}
                  >
                    {brand.name}
                  </div>
                );
              })}
            </div>
          )}

          <ul className="space-y-2 overflow-y-auto pr-1">
            {form.brands.map((b: any) => (
              <li key={b._id} className="flex justify-between items-center bg-white border shadow-sm p-2 rounded-xl">
                <span className="font-medium truncate pr-2 w-1/2">{b.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    placeholder="Global"
                    value={b.price}
                    onChange={(e) => updateItemPrice(b._id, "brand", e.target.value)}
                    className="w-20 p-1 border rounded-md text-right text-sm"
                  />
                  <button onClick={() => removeItem(b._id, "brand")} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* PRODUCTS COLUMN */}
        <div className="flex flex-col bg-gray-50 p-4 rounded-xl border max-h-[45vh]">
          <h3 className="font-semibold text-lg mb-2">Assign Products</h3>
          <input
            placeholder="Search Product..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="bg-white p-3 rounded-xl w-full border shadow-sm mb-2"
          />
          {productSearch && (
            <div className="flex flex-col w-full bg-white rounded-xl shadow-xl border max-h-40 overflow-auto z-10 mb-2">
              {products.length === 0 && <div className="p-2 text-gray-500">No products found</div>}
              {products.map((product: any) => {
                const alreadyAdded = form.products.some((p: any) => p._id === product._id);
                return (
                  <div
                    key={product._id}
                    onClick={() => !alreadyAdded && addProduct(product)}
                    className={`p-3 cursor-pointer ${
                      alreadyAdded ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-medium">
                      {product.brand?.name} {product.name} {product.weight || ""}{product.unit?.toUpperCase() || ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <ul className="space-y-2 overflow-y-auto pr-1">
            {form.products.map((p: any) => (
              <li key={p._id} className="flex justify-between items-center bg-white border shadow-sm p-2 rounded-xl">
                <span className="font-medium text-sm truncate pr-2 w-1/2">
                  {p.brand} {p.name} {p.weight || ""}{p.uom?.toUpperCase() || ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    placeholder="Global"
                    value={p.price}
                    onChange={(e) => updateItemPrice(p._id, "product", e.target.value)}
                    className="w-20 p-1 border rounded-md text-right text-sm"
                  />
                  <button onClick={() => removeItem(p._id, "product")} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}