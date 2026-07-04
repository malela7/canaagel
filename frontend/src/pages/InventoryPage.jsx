import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function InventoryPage() {
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [paperBags, setPaperBags] = useState([]);

  const [milkTypeName, setMilkTypeName] = useState("");
  const PACK_SIZE_OPTIONS = [
    { label: "1L",   litres: "1" },
    { label: "1.5L", litres: "1.5" },
    { label: "2L",   litres: "2" },
    { label: "3L",   litres: "3" },
    { label: "5L",   litres: "5" },
    { label: "10L",  litres: "10" },
    { label: "20L",  litres: "20" },
  ];
  const [packSizeForm, setPackSizeForm] = useState({ label: "", litres: "" });
  const [priceForm, setPriceForm] = useState({ milk_type: "", pack_size: "", amount: "" });

  const loadAll = () => {
    api.get("/inventory/milk-types/").then((r) => setMilkTypes(r.data.results || r.data));
    api.get("/inventory/pack-sizes/").then((r) => setPackSizes(r.data.results || r.data));
    api.get("/inventory/prices/").then((r) => setPrices(r.data.results || r.data));
    api.get("/inventory/stock/").then((r) => setStock(r.data.results || r.data));
    api.get("/inventory/paper-bag-stock/").then((r) => setPaperBags(r.data.results || r.data));
  };

  useEffect(() => { loadAll(); }, []);

  const addMilkType = async (e) => {
    e.preventDefault();
    await api.post("/inventory/milk-types/", { name: milkTypeName });
    setMilkTypeName("");
    loadAll();
  };

  const addPackSize = async (e) => {
    e.preventDefault();
    await api.post("/inventory/pack-sizes/", packSizeForm);
    setPackSizeForm({ label: "", litres: "" });
    loadAll();
  };

  const setPrice = async (e) => {
    e.preventDefault();
    await api.post("/inventory/prices/set/", priceForm);
    setPriceForm({ milk_type: "", pack_size: "", amount: "" });
    loadAll();
  };

  const updateStock = async (item, quantity) => {
    await api.patch(`/inventory/stock/${item.id}/`, { quantity });
    loadAll();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Inventory</h1>

      <div className="grid grid-cols-2 gap-4">
        <form onSubmit={addMilkType} className="bg-white shadow rounded p-4 space-y-2">
          <h2 className="font-semibold">Milk Types</h2>
          {milkTypes.map((m) => <div key={m.id} className="text-sm text-gray-600">{m.name}</div>)}
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" placeholder="e.g. Cow"
              value={milkTypeName} onChange={(e) => setMilkTypeName(e.target.value)} required />
            <button className="bg-green-600 text-white rounded px-3">Add</button>
          </div>
        </form>

        <form onSubmit={addPackSize} className="bg-white shadow rounded p-4 space-y-2">
          <h2 className="font-semibold">Pack Sizes</h2>
          {packSizes.map((p) => <div key={p.id} className="text-sm text-gray-600">{p.label} ({p.litres}L)</div>)}
          <div className="flex gap-2">
            <select className="border rounded px-2 py-1 flex-1"
              value={packSizeForm.label}
              onChange={(e) => {
                const opt = PACK_SIZE_OPTIONS.find(o => o.label === e.target.value);
                setPackSizeForm(opt ? { label: opt.label, litres: opt.litres } : { label: "", litres: "" });
              }} required>
              <option value="">Select size</option>
              {PACK_SIZE_OPTIONS.map((o) => (
                <option key={o.label} value={o.label}>{o.label}</option>
              ))}
            </select>
            <button className="bg-green-600 text-white rounded px-3">Add</button>
          </div>
        </form>
      </div>

      <form onSubmit={setPrice} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Set Price (closes previous price automatically)</h2>
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1 flex-1" value={priceForm.milk_type}
            onChange={(e) => setPriceForm({ ...priceForm, milk_type: e.target.value })} required>
            <option value="">Milk type</option>
            {milkTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 flex-1" value={priceForm.pack_size}
            onChange={(e) => setPriceForm({ ...priceForm, pack_size: e.target.value })} required>
            <option value="">Pack size</option>
            {packSizes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input className="border rounded px-2 py-1 w-28" type="number" step="0.01" placeholder="Amount (KES)"
            value={priceForm.amount} onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })} required />
          <button className="bg-green-600 text-white rounded px-3">Set</button>
        </div>
        <div className="text-sm text-gray-600">
          {prices.map((p) => (
            <div key={p.id}>{p.milk_type} / {p.pack_size}: KES {p.amount}</div>
          ))}
        </div>
      </form>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Stock</h2>
        <div className="space-y-2">
          {stock.map((s) => (
            <div key={s.id} className={`flex items-center justify-between ${s.is_low ? "text-red-600" : ""}`}>
              <span>{s.milk_type} / {s.pack_size}: {s.quantity} {s.is_low && "(LOW)"}</span>
              <input
                type="number" step="0.01" defaultValue={s.quantity}
                className="border rounded px-2 py-1 w-24"
                onBlur={(e) => updateStock(s, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Paper Bags</h2>
        {paperBags.map((p) => (
          <div key={p.id} className={p.is_low ? "text-red-600" : ""}>
            {p.label}: {p.quantity} {p.is_low && "(LOW)"}
          </div>
        ))}
      </div>
    </div>
  );
}
