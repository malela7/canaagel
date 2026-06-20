import React, { useEffect, useState } from "react";
import api from "../api/client";
import Badge from "../components/Badge";

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
          <div>
            <label className="block text-xs text-gray-500 mb-1">New milk type</label>
            <div className="flex gap-2">
              <input className="border rounded px-2 py-1 flex-1" placeholder="e.g. Cow"
                value={milkTypeName} onChange={(e) => setMilkTypeName(e.target.value)} required />
              <button className="bg-green-600 text-white rounded px-3">Add</button>
            </div>
          </div>
        </form>

        <form onSubmit={addPackSize} className="bg-white shadow rounded p-4 space-y-2">
          <h2 className="font-semibold">Pack Sizes</h2>
          {packSizes.map((p) => <div key={p.id} className="text-sm text-gray-600">{p.label} ({p.litres}L)</div>)}
          <div>
            <label className="block text-xs text-gray-500 mb-1">New pack size</label>
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
          </div>
        </form>
      </div>

      <form onSubmit={setPrice} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Set Price (closes previous price automatically)</h2>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Milk type</label>
            <select className="border rounded px-2 py-1 w-full" value={priceForm.milk_type}
              onChange={(e) => setPriceForm({ ...priceForm, milk_type: e.target.value })} required>
              <option value="">Select milk type</option>
              {milkTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pack size</label>
            <select className="border rounded px-2 py-1 w-full" value={priceForm.pack_size}
              onChange={(e) => setPriceForm({ ...priceForm, pack_size: e.target.value })} required>
              <option value="">Select pack size</option>
              {packSizes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (KES)</label>
            <div className="flex gap-2">
              <input className="border rounded px-2 py-1 w-full" type="number" step="0.01" placeholder="e.g. 60"
                value={priceForm.amount} onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })} required />
              <button className="bg-green-600 text-white rounded px-3">Set</button>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {prices.map((p) => (
            <div key={p.id}>{p.milk_type_name} / {p.pack_size_label}: KES {p.amount}</div>
          ))}
        </div>
      </form>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Stock</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-4 font-medium text-gray-600">Item</th>
              <th className="py-1 pr-4 font-medium text-gray-600">Quantity</th>
              <th className="py-1 pr-4 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-1 pr-4">{s.milk_type_name} / {s.pack_size_label}</td>
                <td className="py-1 pr-4">
                  <input
                    type="number" step="0.01" defaultValue={s.quantity}
                    className="border rounded px-2 py-1 w-24"
                    onBlur={(e) => updateStock(s, e.target.value)}
                  />
                </td>
                <td className="py-1 pr-4">{s.is_low && <Badge color="red">Low</Badge>}</td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-gray-500">No stock items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Paper Bags</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-4 font-medium text-gray-600">Label</th>
              <th className="py-1 pr-4 font-medium text-gray-600">Quantity</th>
              <th className="py-1 pr-4 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {paperBags.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-1 pr-4">{p.label}</td>
                <td className="py-1 pr-4">{p.quantity}</td>
                <td className="py-1 pr-4">{p.is_low && <Badge color="red">Low</Badge>}</td>
              </tr>
            ))}
            {paperBags.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-gray-500">No paper bag stock yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
