import React, { useEffect, useState } from "react";
import api from "../api/client";

const emptyForm = {
  shop_name: "", phone_number: "", monthly_fee: "",
  owner_username: "", owner_password: "", owner_first_name: "", owner_last_name: "",
};

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});

  const load = () => api.get("/shops/").then((r) => setShops(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrors([]);
    try {
      await api.post("/shops/", form);
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const messages = [];
        const collect = (obj, prefix = "") => {
          Object.entries(obj).forEach(([key, val]) => {
            if (Array.isArray(val)) messages.push(`${prefix}${key}: ${val.join(" ")}`);
            else if (typeof val === "object" && val !== null) collect(val, `${key}.`);
            else messages.push(`${prefix}${key}: ${val}`);
          });
        };
        collect(data);
        setErrors(messages.length ? messages : ["Could not register shop. Check the fields and try again."]);
      } else {
        setErrors(["Could not register shop. Check the fields and try again."]);
      }
    }
  };

  const suspend = async (id, name) => {
    if (!window.confirm(`Suspend "${name}"? They will lose access until reactivated.`)) return;
    await api.post(`/shops/${id}/suspend/`); load();
  };
  const activate = async (id) => { await api.post(`/shops/${id}/activate/`); load(); };
  const extendTrial = async (id) => { await api.post(`/shops/${id}/extend-trial/`); load(); };
  const recordPayment = async (id) => {
    const amount = paymentAmounts[id];
    if (!amount) return;
    await api.post(`/shops/${id}/record-payment/`, { amount, method: "CASH" });
    setPaymentAmounts((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Shops</h1>

      <form onSubmit={handleCreate} autoComplete="off" className="bg-white shadow rounded p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Register new shop</h2>
          <p className="text-sm text-gray-500">Add a new shop to your Milkshop SaaS account</p>
        </div>

        {errors.length > 0 && (
          <ul className="text-red-600 text-sm list-disc pl-5 space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Shop details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Shop name *</label>
              <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Jey Milk Shop" required
                autoComplete="off" name="shop_name_field"
                value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone number *</label>
              <input className="border rounded px-3 py-2 w-full" placeholder="2547XXXXXXXX" required
                autoComplete="off" name="shop_phone_field"
                value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly subscription fee, KES *</label>
              <input className="border rounded px-3 py-2 w-full" type="number" step="0.01" placeholder="e.g. 2000" required
                autoComplete="off" name="monthly_fee_field"
                value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} />
              <div className="text-xs text-gray-400 mt-1">New shops get a 1-month free trial automatically; this is what they pay each month after.</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Owner / Admin credentials</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username *</label>
              <input className="border rounded px-3 py-2 w-full" placeholder="e.g. jabir_owner" required
                autoComplete="off" name="owner_username_field"
                value={form.owner_username} onChange={(e) => setForm({ ...form, owner_username: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password *</label>
              <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Set a password for the owner" required
                autoComplete="new-password" name="owner_password_field"
                value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Owner name</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First name</label>
              <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Jabir"
                autoComplete="off" name="owner_first_name_field"
                value={form.owner_first_name} onChange={(e) => setForm({ ...form, owner_first_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last name</label>
              <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Ali"
                autoComplete="off" name="owner_last_name_field"
                value={form.owner_last_name} onChange={(e) => setForm({ ...form, owner_last_name: e.target.value })} />
            </div>
          </div>
        </div>

        <button className="w-full bg-green-600 text-white rounded py-2 font-semibold">Register shop</button>
      </form>

      <div className="bg-white shadow rounded divide-y">
        {shops.map((s) => (
          <div key={s.id} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name} <span className="text-xs text-gray-500">({s.status})</span></div>
                <div className="text-sm text-gray-500">
                  Trial ends: {s.trial_ends_at || "—"} · Fee: KES {s.monthly_fee}
                </div>
              </div>
              <div className="flex gap-2">
                {s.status === "SUSPENDED" || s.status === "EXPIRED" ? (
                  <button onClick={() => activate(s.id)} className="bg-green-600 text-white rounded px-3 py-1 text-sm">Activate</button>
                ) : (
                  <button onClick={() => suspend(s.id, s.name)} className="bg-red-600 text-white rounded px-3 py-1 text-sm">Suspend</button>
                )}
                <button onClick={() => extendTrial(s.id)} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">Extend Trial</button>
              </div>
            </div>
            <div className="flex gap-2 mt-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount paid</label>
                <input type="number" step="0.01" placeholder="e.g. 2000"
                  className="border rounded px-2 py-1 w-32"
                  value={paymentAmounts[s.id] || ""}
                  onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [s.id]: e.target.value }))} />
              </div>
              <button onClick={() => recordPayment(s.id)} className="bg-gray-700 text-white rounded px-3 py-1 text-sm">
                Record Payment (auto-reactivates)
              </button>
            </div>
          </div>
        ))}
        {shops.length === 0 && <div className="p-3 text-gray-500 text-sm">No shops yet.</div>}
      </div>
    </div>
  );
}
