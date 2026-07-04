import React, { useEffect, useState } from "react";
import api from "../api/client";

// ── helpers ──────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const emptyRow = () => ({
  _key: uid(),
  milk_type_id: null,
  milk_name: "",
  pack_size_id: null,
  pack_label: "",
  litres: "",
  cost_price: "0",
  sell_price: "0",
  bulk_cost: "",
  bulk_sell: "",
  stock_qty: "0",
  _stock_id: null,
});

const profitMarkup = (cost, sell) => {
  const c = parseFloat(cost), s = parseFloat(sell);
  if (!c || c === 0 || !s) return "—";
  return `${((s - c) / c * 100).toFixed(1)}%`;
};

// ── main component ────────────────────────────────────────
export default function InventoryPage() {
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices,    setPrices]    = useState([]);
  const [stock,     setStock]     = useState([]);
  const [bulkEnabled, setBulkEnabled] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("setup"); // "setup" | "suppliers" | "goods"

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [expandedSup, setExpandedSup] = useState(null);
  const [billForm, setBillForm] = useState(null); // { supplier_id, date, total, paid, note }

  // Goods received state
  const [goodsRows, setGoodsRows] = useState([emptyGoodsRow()]);
  const [goodsSupplier, setGoodsSupplier] = useState("");
  const [goodsDate, setGoodsDate] = useState(today());
  const [savingGoods, setSavingGoods] = useState(false);
  const [goodsHistory, setGoodsHistory] = useState([]);

  function today() { return new Date().toISOString().slice(0, 10); }
  function emptyGoodsRow() {
    return { _key: uid(), milk_type_id: null, pack_size_id: null, cost_price: "0", sell_price: "0", quantity: "0" };
  }

  const loadAll = async () => {
    const [mt, ps, pr, st, sup] = await Promise.all([
      api.get("/inventory/milk-types/"),
      api.get("/inventory/pack-sizes/"),
      api.get("/inventory/prices/"),
      api.get("/inventory/stock/"),
      api.get("/inventory/suppliers/"),
    ]);
    const mts = mt.data.results || mt.data;
    const pss = ps.data.results || ps.data;
    const prs = pr.data.results || pr.data;
    const sts = st.data.results || st.data;
    setMilkTypes(mts);
    setPackSizes(pss);
    setPrices(prs);
    setStock(sts);
    setSuppliers(sup.data.results || sup.data);

    // Rebuild rows from existing prices
    const seen = new Set();
    const built = [];
    for (const p of prs) {
      const key = `${p.milk_type}-${p.pack_size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const psEntry = pss.find(x => String(x.id) === String(p.pack_size));
      const stEntry = sts.find(x => String(x.milk_type) === String(p.milk_type) && String(x.pack_size) === String(p.pack_size));
      built.push({
        ...emptyRow(),
        milk_type_id: p.milk_type,
        milk_name: p.milk_type_name || "",
        pack_size_id: p.pack_size,
        pack_label: p.pack_size_label || "",
        litres: psEntry ? String(psEntry.litres) : "",
        cost_price: p.cost_price ? String(p.cost_price) : "0",
        sell_price: p.amount ? String(p.amount) : "0",
        stock_qty: stEntry ? String(stEntry.quantity) : "0",
        _stock_id: stEntry?.id ?? null,
      });
    }
    setRows(built.length > 0 ? built : [emptyRow()]);
  };

  useEffect(() => { loadAll(); }, []);

  // ── Setup: row helpers ────────────────────────────────
  const updateRow = (key, field, val) =>
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));

  const resetRow = (key) =>
    setRows(prev => prev.map(r => r._key === key ? emptyRow() : r));

  const deleteRow = (key) =>
    setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter(r => r._key !== key));

  const saveAll = async () => {
    const filled = rows.filter(r => r.milk_name.trim());
    if (!filled.length) return alert("Enter at least one milk name.");
    setSaving(true);
    const errors = [];
    for (const row of filled) {
      try {
        let mtId = row.milk_type_id;
        if (!mtId && row.milk_name.trim()) {
          const ex = milkTypes.find(m => m.name.toLowerCase() === row.milk_name.trim().toLowerCase());
          mtId = ex ? ex.id : (await api.post("/inventory/milk-types/", { name: row.milk_name.trim() })).data.id;
        }
        let psId = row.pack_size_id;
        if (!psId && row.pack_label.trim()) {
          const ex = packSizes.find(p => p.label.toLowerCase() === row.pack_label.trim().toLowerCase());
          psId = ex ? ex.id : (await api.post("/inventory/pack-sizes/", { label: row.pack_label.trim(), litres: parseFloat(row.litres) || 0 })).data.id;
        }
        if (!mtId) { errors.push(`"${row.milk_name}" — missing milk name`); continue; }
        if (psId && row.sell_price) {
          await api.post("/inventory/prices/set/", {
            milk_type: mtId, pack_size: psId,
            amount: parseFloat(row.sell_price) || 0,
            cost_price: parseFloat(row.cost_price) || 0,
          });
        }
        if (psId) {
          const qty = parseFloat(row.stock_qty) || 0;
          if (row._stock_id) {
            await api.patch(`/inventory/stock/${row._stock_id}/`, { quantity: qty });
          } else {
            await api.post("/inventory/stock/", { milk_type: mtId, pack_size: psId, quantity: qty }).catch(() => {});
          }
        }
      } catch (e) {
        errors.push(`"${row.milk_name}": ${e?.response?.data?.detail || "error"}`);
      }
    }
    setSaving(false);
    if (errors.length) alert("Errors:\n" + errors.join("\n"));
    loadAll();
  };

  // ── Supplier helpers ──────────────────────────────────
  const addSupplier = async (e) => {
    e.preventDefault();
    setAddingSupplier(true);
    try {
      await api.post("/inventory/suppliers/", { name: supName.trim(), phone: supPhone.trim() });
      setSupName(""); setSupPhone("");
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.name?.[0] || "Could not add supplier.");
    } finally { setAddingSupplier(false); }
  };

  const saveBill = async (e) => {
    e.preventDefault();
    if (!billForm?.total) return;
    try {
      await api.post(`/inventory/suppliers/${billForm.supplier_id}/bills/`, {
        date: billForm.date,
        total_amount: parseFloat(billForm.total) || 0,
        amount_paid: parseFloat(billForm.paid) || 0,
        note: billForm.note || "",
      });
      setBillForm(null);
      loadAll();
    } catch { alert("Could not save bill."); }
  };

  // ── Goods received helpers ────────────────────────────
  const updateGoodsRow = (key, field, val) =>
    setGoodsRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));

  const saveGoods = async () => {
    const valid = goodsRows.filter(r => r.milk_type_id && r.pack_size_id && parseFloat(r.quantity) > 0);
    if (!valid.length) return alert("Fill in at least one row with milk type, pack size and quantity.");
    setSavingGoods(true);
    const errors = [], received = [];
    for (const it of valid) {
      const mt = milkTypes.find(m => String(m.id) === String(it.milk_type_id));
      const ps = packSizes.find(p => String(p.id) === String(it.pack_size_id));
      const stEntry = stock.find(s => String(s.milk_type) === String(it.milk_type_id) && String(s.pack_size) === String(it.pack_size_id));
      const qty = parseFloat(it.quantity);
      try {
        if (stEntry) {
          await api.patch(`/inventory/stock/${stEntry.id}/`, { quantity: parseFloat(stEntry.quantity) + qty });
        } else {
          await api.post("/inventory/stock/", { milk_type: it.milk_type_id, pack_size: it.pack_size_id, quantity: qty });
        }
        if (it.cost_price || it.sell_price) {
          await api.post("/inventory/prices/set/", {
            milk_type: it.milk_type_id, pack_size: it.pack_size_id,
            amount: parseFloat(it.sell_price) || 0,
            cost_price: parseFloat(it.cost_price) || 0,
          }).catch(() => {});
        }
        received.push({ name: `${mt?.name}/${ps?.label}`, qty });
      } catch { errors.push(`${mt?.name}/${ps?.label}: error`); }
    }
    setSavingGoods(false);
    if (errors.length) alert("Errors:\n" + errors.join("\n"));
    if (received.length) {
      setGoodsHistory(prev => [{ id: uid(), supplier: goodsSupplier || "Unknown", date: goodsDate, items: received }, ...prev]);
      setGoodsRows([emptyGoodsRow()]); setGoodsSupplier(""); setGoodsDate(today());
      loadAll();
    }
  };

  const grandTotal = goodsRows.reduce((s, r) => s + (parseFloat(r.cost_price) || 0) * (parseFloat(r.quantity) || 0), 0);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {["setup", "suppliers", "goods"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-600 rounded-t border-b-2 transition-colors ${tab === t ? "border-green-600 text-green-700 bg-white font-bold" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "setup" ? "Setup" : t === "suppliers" ? "Suppliers" : "Goods Received"}
          </button>
        ))}
      </div>

      {/* ══════════════ SETUP TAB ══════════════ */}
      {tab === "setup" && (
        <div>
          {/* Top action bar */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setRows(p => [...p, emptyRow()])}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded flex items-center gap-1">
              + Add Row
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Enable Bulk Price:</span>
              <button onClick={() => setBulkEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bulkEnabled ? "bg-green-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${bulkEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-xs font-bold ${bulkEnabled ? "text-green-600" : "text-gray-400"}`}>{bulkEnabled ? "YES" : "NO"}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-600 text-white text-xs">
                  <th className="px-3 py-3 text-left font-700 w-20">Action</th>
                  <th className="px-3 py-3 text-left font-700 min-w-[140px]">
                    Product Name<br /><span className="font-normal text-gray-300">(Milk Name)</span>
                  </th>
                  <th className="px-3 py-3 text-left font-700 min-w-[110px]">Pack Size</th>
                  <th className="px-3 py-3 text-left font-700 w-24">Per Liters</th>
                  <th className="px-3 py-3 text-left font-700 w-28">
                    Cost Price<br /><span className="font-normal text-gray-300">(Incl Tax) Ksh</span>
                  </th>
                  <th className="px-3 py-3 text-left font-700 w-28">
                    Sale Price<br /><span className="font-normal text-gray-300">(Incl Tax) Ksh</span>
                  </th>
                  <th className="px-3 py-3 text-center font-700 w-24">
                    Profit Markup<br /><span className="font-normal text-gray-300">(%)</span>
                  </th>
                  {bulkEnabled && (
                    <>
                      <th className="px-3 py-3 text-left font-700 w-28">
                        Bulk Cost<br /><span className="font-normal text-gray-300">Ksh</span>
                      </th>
                      <th className="px-3 py-3 text-left font-700 w-28">
                        Bulk Price<br /><span className="font-normal text-gray-300">Ksh</span>
                      </th>
                    </>
                  )}
                  <th className="px-3 py-3 text-left font-700 w-24">
                    Current<br /><span className="font-normal text-gray-300">Quantity</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const markup = profitMarkup(row.cost_price, row.sell_price);
                  const profitable = parseFloat(row.sell_price) > parseFloat(row.cost_price);
                  return (
                    <tr key={row._key} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {/* Action */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => resetRow(row._key)} title="Reset row"
                            className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button onClick={() => deleteRow(row._key)} title="Delete row"
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {/* Milk Name */}
                      <td className="px-3 py-2">
                        <input
                          list={`mt-list-${row._key}`}
                          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${!row.milk_name ? "border-red-300" : "border-gray-300"}`}
                          placeholder="Enter milk name..."
                          value={row.milk_name}
                          onChange={(e) => {
                            updateRow(row._key, "milk_name", e.target.value);
                            const mt = milkTypes.find(m => m.name === e.target.value);
                            if (mt) updateRow(row._key, "milk_type_id", mt.id);
                            else updateRow(row._key, "milk_type_id", null);
                          }}
                        />
                        <datalist id={`mt-list-${row._key}`}>
                          {milkTypes.map(m => <option key={m.id} value={m.name} />)}
                        </datalist>
                      </td>
                      {/* Pack Size */}
                      <td className="px-3 py-2">
                        <input
                          list={`ps-list-${row._key}`}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="e.g. 1L"
                          value={row.pack_label}
                          onChange={(e) => {
                            updateRow(row._key, "pack_label", e.target.value);
                            const ps = packSizes.find(p => p.label === e.target.value);
                            if (ps) { updateRow(row._key, "pack_size_id", ps.id); updateRow(row._key, "litres", String(ps.litres)); }
                            else updateRow(row._key, "pack_size_id", null);
                          }}
                        />
                        <datalist id={`ps-list-${row._key}`}>
                          {packSizes.map(p => <option key={p.id} value={p.label} />)}
                        </datalist>
                      </td>
                      {/* Litres */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.001" min="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.litres} placeholder="0"
                          onChange={(e) => updateRow(row._key, "litres", e.target.value)} />
                      </td>
                      {/* Cost Price */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.cost_price}
                          onChange={(e) => updateRow(row._key, "cost_price", e.target.value)} />
                      </td>
                      {/* Sell Price */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0"
                          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${!row.sell_price || row.sell_price === "0" ? "border-red-300" : "border-gray-300"}`}
                          value={row.sell_price}
                          onChange={(e) => updateRow(row._key, "sell_price", e.target.value)} />
                      </td>
                      {/* Profit Markup */}
                      <td className="px-3 py-2 text-center">
                        <span className={`text-sm font-bold ${profitable ? "text-green-600" : "text-gray-400"}`}>
                          {markup}
                        </span>
                      </td>
                      {/* Bulk */}
                      {bulkEnabled && (
                        <>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" min="0"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
                              placeholder="0" value={row.bulk_cost}
                              onChange={(e) => updateRow(row._key, "bulk_cost", e.target.value)} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" min="0"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
                              placeholder="0" value={row.bulk_sell}
                              onChange={(e) => updateRow(row._key, "bulk_sell", e.target.value)} />
                          </td>
                        </>
                      )}
                      {/* Current Qty */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.stock_qty}
                          onChange={(e) => updateRow(row._key, "stock_qty", e.target.value)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={saveAll} disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-8 py-2 rounded shadow transition-colors">
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ SUPPLIERS TAB ══════════════ */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          {/* Add supplier form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h2 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Add Supplier</h2>
            <form onSubmit={addSupplier} className="flex gap-3 flex-wrap">
              <input className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Supplier name *" value={supName} onChange={e => setSupName(e.target.value)} required />
              <input className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none"
                placeholder="Phone (optional)" value={supPhone} onChange={e => setSupPhone(e.target.value)} />
              <button type="submit" disabled={addingSupplier}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded text-sm disabled:opacity-50">
                {addingSupplier ? "Adding..." : "+ Add Supplier"}
              </button>
            </form>
          </div>

          {/* Supplier list */}
          {suppliers.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No suppliers yet.</p>
          )}
          {suppliers.map(sup => {
            const owed = parseFloat(sup.total_owed) || 0;
            const isOpen = expandedSup === sup.id;
            return (
              <div key={sup.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSup(isOpen ? null : sup.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                      {sup.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 text-sm">{sup.name}</div>
                      {sup.phone && <div className="text-xs text-gray-500">{sup.phone}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {owed > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                        Owed: KES {owed.toLocaleString()}
                      </span>
                    )}
                    <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* Bills table */}
                    {(sup.bills || []).length > 0 && (
                      <table className="w-full text-sm mt-3 mb-3">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b">
                            <th className="text-left py-1 font-600">Date</th>
                            <th className="text-right py-1 font-600">Total</th>
                            <th className="text-right py-1 font-600">Paid</th>
                            <th className="text-right py-1 font-600">Balance</th>
                            <th className="text-left py-1 font-600 pl-3">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sup.bills.map(b => (
                            <tr key={b.id} className="border-b border-gray-50">
                              <td className="py-1.5">{b.date}</td>
                              <td className="py-1.5 text-right">{parseFloat(b.total_amount).toLocaleString()}</td>
                              <td className="py-1.5 text-right text-green-600">{parseFloat(b.amount_paid).toLocaleString()}</td>
                              <td className={`py-1.5 text-right font-bold ${parseFloat(b.balance) > 0 ? "text-red-500" : "text-green-600"}`}>
                                {parseFloat(b.balance) > 0 ? parseFloat(b.balance).toLocaleString() : "Paid ✓"}
                              </td>
                              <td className="py-1.5 pl-3 text-gray-500 text-xs">{b.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {(sup.bills || []).length === 0 && <p className="text-gray-400 text-xs mt-3 mb-2">No bills yet.</p>}

                    {/* Add bill form */}
                    {billForm?.supplier_id === sup.id ? (
                      <form onSubmit={saveBill} className="flex flex-wrap gap-2 items-end mt-2 bg-gray-50 p-3 rounded-lg">
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Date</label>
                          <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={billForm.date} onChange={e => setBillForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Total (KES)</label>
                          <input type="number" step="0.01" min="0" className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                            placeholder="0" value={billForm.total} onChange={e => setBillForm(f => ({ ...f, total: e.target.value }))} required />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Amount Paid (KES)</label>
                          <input type="number" step="0.01" min="0" className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                            placeholder="0" value={billForm.paid} onChange={e => setBillForm(f => ({ ...f, paid: e.target.value }))} />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block mb-0.5">Note</label>
                          <input className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                            placeholder="Optional" value={billForm.note} onChange={e => setBillForm(f => ({ ...f, note: e.target.value }))} />
                        </div>
                        <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold">Save</button>
                        <button type="button" onClick={() => setBillForm(null)} className="text-gray-500 px-3 py-1.5 rounded text-sm border">Cancel</button>
                      </form>
                    ) : (
                      <button onClick={() => setBillForm({ supplier_id: sup.id, date: today(), total: "", paid: "", note: "" })}
                        className="mt-2 text-green-600 border border-dashed border-green-400 hover:bg-green-50 text-sm font-semibold px-4 py-1.5 rounded w-full transition-colors">
                        + Add Bill
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════ GOODS RECEIVED TAB ══════════════ */}
      {tab === "goods" && (
        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Supplier</label>
              <select className="border border-gray-300 rounded px-3 py-2 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={goodsSupplier} onChange={e => setGoodsSupplier(e.target.value)}>
                <option value="">-- Select supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date Received</label>
              <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                value={goodsDate} onChange={e => setGoodsDate(e.target.value)} />
            </div>
            <button onClick={() => setGoodsRows(p => [...p, emptyGoodsRow()])}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded">
              + Add Product
            </button>
          </div>

          {/* Goods table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-600 text-white text-xs">
                  <th className="px-3 py-3 text-left w-16">Action</th>
                  <th className="px-3 py-3 text-left w-8">SN</th>
                  <th className="px-3 py-3 text-left min-w-[140px]">Product Name</th>
                  <th className="px-3 py-3 text-left min-w-[110px]">Pack Size</th>
                  <th className="px-3 py-3 text-left w-28">Cost Price<br /><span className="font-normal text-gray-300">Ksh</span></th>
                  <th className="px-3 py-3 text-left w-28">Sell Price<br /><span className="font-normal text-gray-300">Ksh</span></th>
                  <th className="px-3 py-3 text-left w-24">Quantity</th>
                  <th className="px-3 py-3 text-left w-28">Total<br /><span className="font-normal text-gray-300">Ksh</span></th>
                </tr>
              </thead>
              <tbody>
                {goodsRows.map((row, idx) => {
                  const rowTotal = (parseFloat(row.cost_price) || 0) * (parseFloat(row.quantity) || 0);
                  return (
                    <tr key={row._key} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2">
                        <button onClick={() => setGoodsRows(p => p.length === 1 ? [emptyGoodsRow()] : p.filter(r => r._key !== row._key))}
                          className="text-red-400 hover:text-red-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-bold">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.milk_type_id || ""}
                          onChange={e => updateGoodsRow(row._key, "milk_type_id", e.target.value)}>
                          <option value="">Select milk type</option>
                          {milkTypes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.pack_size_id || ""}
                          onChange={e => updateGoodsRow(row._key, "pack_size_id", e.target.value)}>
                          <option value="">Select pack size</option>
                          {packSizes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" placeholder="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
                          value={row.cost_price} onChange={e => updateGoodsRow(row._key, "cost_price", e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" placeholder="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
                          value={row.sell_price} onChange={e => updateGoodsRow(row._key, "sell_price", e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" placeholder="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={row.quantity} onChange={e => updateGoodsRow(row._key, "quantity", e.target.value)} />
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-700">{rowTotal > 0 ? rowTotal.toLocaleString() : "0"}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 border-t-2 border-gray-300">
                  <td colSpan={bulkEnabled ? 9 : 7} className="px-3 py-2 text-right font-bold text-gray-700 text-sm">Grand Total:</td>
                  <td className="px-3 py-2 font-bold text-green-700">{grandTotal > 0 ? grandTotal.toLocaleString() : "0"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button onClick={saveGoods} disabled={savingGoods}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-8 py-2 rounded shadow transition-colors">
              {savingGoods ? "Saving..." : "Confirm Goods Received"}
            </button>
          </div>

          {/* Session history */}
          {goodsHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Received This Session</h3>
              {goodsHistory.map(r => (
                <div key={r.id} className="bg-white border-l-4 border-green-500 rounded shadow-sm p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm">{r.supplier}</div>
                      <div className="text-xs text-gray-500">{r.date}</div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">{r.items.length} item{r.items.length !== 1 ? "s" : ""}</span>
                  </div>
                  {r.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">• {it.name}</span>
                      <span className="font-bold text-green-600">+{it.qty}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
