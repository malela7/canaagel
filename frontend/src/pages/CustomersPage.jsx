import React, { useEffect, useState } from "react";
import api from "../api/client";

const FREQUENCIES = ["NONE", "DAILY", "WEEKDAYS", "CUSTOM"];
const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "",
    payment_schedule: "CASH", delivery_frequency: "NONE",
    bottle_tracking: false,
  });
  const [paymentForm, setPaymentForm] = useState({});
  const [error, setError] = useState(null);

  const load = () => api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
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
        <input className="border rounded px-3 py-2" placeholder="Name" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Phone (2547XXXXXXXX)"
          value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        <input className="border rounded px-3 py-2 col-span-2" placeholder="Address"
          value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <select className="border rounded px-3 py-2" value={form.payment_schedule}
          onChange={(e) => setForm({ ...form, payment_schedule: e.target.value })}>
          {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={form.delivery_frequency}
          onChange={(e) => setForm({ ...form, delivery_frequency: e.target.value })}>
          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
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

      <div className="bg-white shadow rounded divide-y">
        {customers.map((c) => (
          <div key={c.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-500">
                {c.phone_number} &middot; {c.payment_schedule} &middot; Debt: KES {c.debt_balance}
                {c.bottle_tracking && ` · Bottles out: ${c.bottles_out}`}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number" step="0.01" placeholder="Amount"
                className="border rounded px-2 py-1 w-28"
                value={paymentForm[c.id] || ""}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, [c.id]: e.target.value }))}
              />
              <button onClick={() => handleRecordPayment(c.id)} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">
                Record Payment
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
