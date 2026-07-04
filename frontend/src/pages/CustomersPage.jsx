import React, { useEffect, useState } from "react";
import api from "../api/client";

const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

export default function CustomersPage() {
  const [tab, setTab] = useState("list");
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "",
    payment_schedule: "CASH", bottle_tracking: false,
  });
  const [paymentForm, setPaymentForm] = useState({});
  const [bottleForm, setBottleForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () =>
    api.get("/sales/customers/?page_size=200").then((r) =>
      setCustomers(r.data.results || r.data)
    );

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError(null);
    try {
      await api.post("/sales/customers/", { ...form, delivery_frequency: "NONE" });
      setForm({ name: "", phone_number: "", address: "", payment_schedule: "CASH", bottle_tracking: false });
      load();
      setTab("list");
    } catch {
      setError("Could not save customer.");
    } finally { setSaving(false); }
  };

  const handleRecordPayment = async (customerId) => {
    const amount = paymentForm[customerId];
    if (!amount) return;
    await api.post("/sales/payments/", { customer: customerId, amount, method: "CASH" });
    setPaymentForm((p) => ({ ...p, [customerId]: "" }));
    load();
  };

  const handleBottleReturn = async (c, delta) => {
    await api.patch(`/sales/customers/${c.id}/`, { bottles_out: Math.max(0, c.bottles_out + delta) });
    load();
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone_number || "").includes(q) || (c.address || "").toLowerCase().includes(q);
  });

  const creditCustomers = customers.filter((c) => parseFloat(c.debt_balance) > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Customers</h1>
        <span className="text-xs text-gray-500">{customers.length} total · {creditCustomers.length} on credit</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {[["list", "Customer List"], ["register", "Register Customer"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-t border-b-2 transition-colors ${tab === t ? "border-green-600 text-green-700 bg-white font-bold" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Register tab ── */}
      {tab === "register" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 max-w-lg">
          <h2 className="font-bold text-gray-700 mb-4">New Customer</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Customer name *" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
              placeholder="Phone number (2547XXXXXXXX)" value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
              placeholder="Address / House No." value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Payment Schedule</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                value={form.payment_schedule}
                onChange={(e) => setForm({ ...form, payment_schedule: e.target.value })}>
                {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.bottle_tracking}
                onChange={(e) => setForm({ ...form, bottle_tracking: e.target.checked })}
                className="w-4 h-4 accent-green-600" />
              <span className="text-sm text-gray-700">Track bottles for this customer</span>
            </label>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded">
              {saving ? "Saving..." : "+ Add Customer"}
            </button>
          </form>
        </div>
      )}

      {/* ── Customer List tab ── */}
      {tab === "list" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="flex gap-3 items-center">
            <input className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Search by name or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {creditCustomers.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                {creditCustomers.length} customer{creditCustomers.length > 1 ? "s" : ""} with debt
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-600 text-white text-xs">
                  <th className="px-3 py-3 text-left w-10">ID</th>
                  <th className="px-3 py-3 text-left min-w-[140px]">Customer Name</th>
                  <th className="px-3 py-3 text-left min-w-[130px]">Phone Number</th>
                  <th className="px-3 py-3 text-left w-28">Bottles Out</th>
                  <th className="px-3 py-3 text-left w-24">Payment</th>
                  <th className="px-3 py-3 text-right w-28">Debt (KES)</th>
                  <th className="px-3 py-3 text-left min-w-[200px]">Record Payment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No customers found.</td></tr>
                )}
                {filtered.map((c, idx) => {
                  const debt = parseFloat(c.debt_balance) || 0;
                  return (
                    <tr key={c.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${debt > 0 ? "border-l-2 border-red-400" : ""}`}>
                      <td className="px-3 py-2 text-gray-400 font-bold">{c.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-800">{c.name}</div>
                        {c.address && <div className="text-xs text-gray-400">{c.address}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{c.phone_number || "—"}</td>
                      <td className="px-3 py-2">
                        {c.bottle_tracking ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-blue-600">{c.bottles_out}</span>
                            <button onClick={() => handleBottleReturn(c, 1)}
                              className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded hover:bg-blue-200">+</button>
                            <button onClick={() => handleBottleReturn(c, -1)}
                              className="bg-gray-100 text-gray-600 text-xs px-1.5 rounded hover:bg-gray-200">−</button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.payment_schedule === "CASH" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {c.payment_schedule}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>
                        {debt > 0 ? debt.toLocaleString() : "Paid ✓"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5 items-center">
                          <input type="number" step="0.01" placeholder="Amount"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:outline-none"
                            value={paymentForm[c.id] || ""}
                            onChange={(e) => setPaymentForm((p) => ({ ...p, [c.id]: e.target.value }))} />
                          <button onClick={() => handleRecordPayment(c.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded whitespace-nowrap">
                            Record
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
