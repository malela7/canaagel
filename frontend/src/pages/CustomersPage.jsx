import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Badge from "../components/Badge";

const FREQUENCIES = ["NONE", "DAILY", "WEEKDAYS", "CUSTOM"];
const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

const TABS = [
  { key: "all", label: "All" },
  { key: "debt", label: "With debt" },
  { key: "bottles", label: "Bottles out" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "",
    payment_schedule: "CASH", delivery_frequency: "NONE",
    bottle_tracking: false,
  });
  const [paymentForm, setPaymentForm] = useState({});
  const [error, setError] = useState(null);
  const [nameError, setNameError] = useState(null);

  const load = () => api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const visibleCustomers = useMemo(() => {
    if (tab === "debt") return customers.filter((c) => Number(c.debt_balance) > 0);
    if (tab === "bottles") return customers.filter((c) => c.bottle_tracking && Number(c.bottles_out) > 0);
    return customers;
  }, [customers, tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    try {
      await api.post("/sales/customers/", form);
      setForm({ name: "", phone_number: "", address: "", payment_schedule: "CASH", delivery_frequency: "NONE", bottle_tracking: false });
      load();
    } catch (err) {
      setError("Could not create customer.");
    }
  };

  const handleRecordPayment = async (customerId) => {
    const amount = paymentForm[customerId];
    if (!amount) return;
    await api.post("/sales/payments/", { customer: customerId, amount, method: "CASH" });
    setPaymentForm((prev) => ({ ...prev, [customerId]: "" }));
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Customers</h1>

      <form onSubmit={handleCreate} className="bg-white shadow rounded p-4 mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Jane Mwangi" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {nameError && <div className="text-red-600 text-xs mt-1">{nameError}</div>}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phone</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="2547XXXXXXXX"
            value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Kahawa West"
            value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment schedule</label>
          <select className="border rounded px-3 py-2 w-full" value={form.payment_schedule}
            onChange={(e) => setForm({ ...form, payment_schedule: e.target.value })}>
            {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Delivery frequency</label>
          <select className="border rounded px-3 py-2 w-full" value={form.delivery_frequency}
            onChange={(e) => setForm({ ...form, delivery_frequency: e.target.value })}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 col-span-2">
          <input type="checkbox" checked={form.bottle_tracking}
            onChange={(e) => setForm({ ...form, bottle_tracking: e.target.checked })} />
          Track bottles for this customer
        </label>
        {error && <div className="col-span-2 text-red-600 text-sm">{error}</div>}
        <button type="submit" className="col-span-2 bg-green-600 text-white rounded py-2 font-semibold">
          Add Customer
        </button>
      </form>

      <div className="flex gap-2 mb-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1 rounded text-sm ${tab === t.key ? "bg-green-600 text-white" : "bg-white border"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded divide-y">
        {visibleCustomers.map((c) => (
          <div key={c.id} className="p-3">
            <div className="flex justify-between items-baseline">
              <span className="font-medium">{c.name}</span>
              {Number(c.debt_balance) > 0 && <Badge color="red">KES {c.debt_balance} owed</Badge>}
            </div>
            <div className="text-sm text-gray-500 mb-2">
              {c.phone_number} &middot; {c.payment_schedule}
              {c.bottle_tracking && ` · Bottles out: ${c.bottles_out}`}
            </div>
            <div className="flex gap-2">
              <input
                type="number" step="0.01" placeholder="Amount"
                className="border rounded px-2 py-1 flex-1"
                value={paymentForm[c.id] || ""}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, [c.id]: e.target.value }))}
              />
              <button onClick={() => handleRecordPayment(c.id)} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">
                Record Payment
              </button>
            </div>
          </div>
        ))}
        {visibleCustomers.length === 0 && (
          <div className="p-3 text-gray-500 text-sm">No customers in this view.</div>
        )}
      </div>
    </div>
  );
}
