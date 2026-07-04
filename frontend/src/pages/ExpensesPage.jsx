import React, { useEffect, useState } from "react";
import api from "../api/client";

const CATEGORIES = ["TRANSPORT", "SALARY", "UTILITY", "MAINTENANCE", "PURCHASE", "OTHER"];

function today() { return new Date().toISOString().slice(0, 10); }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ date: today(), category: "OTHER", amount: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = () =>
    api.get("/sales/expenses/?page_size=200").then((r) =>
      setExpenses(r.data.results || r.data)
    ).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true); setError(null);
    try {
      await api.post("/sales/expenses/", form);
      setForm({ date: today(), category: "OTHER", amount: "", note: "" });
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save expense.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await api.delete(`/sales/expenses/${id}/`).catch(() => {});
    load();
  };

  const filtered = expenses.filter((ex) => {
    if (filterCat && ex.category !== filterCat) return false;
    if (dateFrom && ex.date < dateFrom) return false;
    if (dateTo && ex.date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(ex.note || "").toLowerCase().includes(q) && !ex.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.reduce((s, ex) => s + parseFloat(ex.amount), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Expenses</h1>

      {/* Add expense form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Add Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount (KES)</label>
            <input type="number" step="0.01" min="0" required placeholder="0"
              className="border border-gray-300 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500 block mb-1">Note</label>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
              placeholder="Description (optional)" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded text-sm">
            {saving ? "Saving..." : "+ Add Expense"}
          </button>
        </form>
        {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-green-500"
          placeholder="Search note / category..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
          value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">From:</label>
          <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none"
            value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">To:</label>
          <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none"
            value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(search || filterCat || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setFilterCat(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-500 hover:text-red-500 underline">Clear filters</button>
        )}
        {filtered.length > 0 && (
          <span className="ml-auto font-bold text-green-700 text-sm">
            Total: KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Expenses table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-600 text-white text-xs">
              <th className="px-3 py-3 text-left w-10">#</th>
              <th className="px-3 py-3 text-left w-28">Date</th>
              <th className="px-3 py-3 text-left w-32">Category</th>
              <th className="px-3 py-3 text-right w-32">Amount (KES)</th>
              <th className="px-3 py-3 text-left">Note</th>
              <th className="px-3 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No expenses found.</td></tr>
            )}
            {filtered.map((ex, idx) => (
              <tr key={ex.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 text-gray-600">{ex.date}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    ex.category === "SALARY" ? "bg-blue-100 text-blue-700" :
                    ex.category === "TRANSPORT" ? "bg-yellow-100 text-yellow-700" :
                    ex.category === "UTILITY" ? "bg-purple-100 text-purple-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{ex.category}</span>
                </td>
                <td className="px-3 py-2 text-right font-bold text-red-600">
                  {parseFloat(ex.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-gray-600">{ex.note || "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => handleDelete(ex.id)}
                    className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td colSpan={3} className="px-3 py-2 font-bold text-gray-600 text-right">Total:</td>
                <td className="px-3 py-2 font-bold text-red-600 text-right">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
