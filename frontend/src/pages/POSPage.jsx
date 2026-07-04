import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function POSPage() {
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ milk_type: "", pack_size: "", quantity: "1" }]);
  const [paperBags, setPaperBags] = useState("0");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/inventory/milk-types/").then((r) => setMilkTypes(r.data.results || r.data));
    api.get("/inventory/pack-sizes/").then((r) => setPackSizes(r.data.results || r.data));
    api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));
  }, []);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { milk_type: "", pack_size: "", quantity: "1" }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const payload = {
        customer: customerId || null,
        is_walk_in: !customerId,
        paper_bags_used: Number(paperBags) || 0,
        items: items
          .filter((it) => it.milk_type && it.pack_size && it.quantity)
          .map((it) => ({
            milk_type: Number(it.milk_type),
            pack_size: Number(it.pack_size),
            quantity: it.quantity,
          })),
      };
      const { data } = await api.post("/sales/orders/", payload);
      setMessage(`Order #${data.id} recorded. Total: KES ${data.total_amount} (${data.payment_status})`);
      setItems([{ milk_type: "", pack_size: "", quantity: "1" }]);
      setPaperBags("0");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not record this sale.");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Point of Sale</h1>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer (leave blank for walk-in)</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Walk-in</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Items</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                className="border rounded px-2 py-2 flex-1"
                value={item.milk_type}
                onChange={(e) => updateItem(idx, "milk_type", e.target.value)}
              >
                <option value="">Milk type</option>
                {milkTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                className="border rounded px-2 py-2 flex-1"
                value={item.pack_size}
                onChange={(e) => updateItem(idx, "pack_size", e.target.value)}
              >
                <option value="">Pack size</option>
                {packSizes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <input
                type="number" step="0.01" min="0"
                className="border rounded px-2 py-2 w-24"
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", e.target.value)}
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-red-600 px-2">
                  &times;
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-sm text-green-700">
            + Add item
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Paper bags used</label>
          <input
            type="number" min="0"
            className="border rounded px-3 py-2 w-32"
            value={paperBags}
            onChange={(e) => setPaperBags(e.target.value)}
          />
        </div>

        <button type="submit" className="bg-green-600 text-white rounded px-6 py-2 font-semibold">
          Complete Sale
        </button>
      </form>
    </div>
  );
}
