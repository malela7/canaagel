import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function SubscriptionPage() {
  const [shop, setShop] = useState(null);
  const [payments, setPayments] = useState([]);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);

  const load = () => {
    api.get("/shops/me/").then((r) => setShop(r.data));
    api.get("/shops/subscription-payments/").then((r) => setPayments(r.data.results || r.data));
  };

  useEffect(() => { load(); }, []);

  const startPayment = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const { data } = await api.post("/shops/mpesa/stk-push/", { phone_number: phone });
      setCheckoutId(data.checkout_request_id || data.CheckoutRequestID);
      setStatus("STK push sent. Enter your M-Pesa PIN on your phone to complete payment.");
    } catch (err) {
      setError("Could not start payment. Check the phone number and try again.");
    }
  };

  const checkStatus = async () => {
    if (!checkoutId) return;
    const { data } = await api.get("/shops/mpesa/stk-status/", { params: { checkout_request_id: checkoutId } });
    setStatus(`Status: ${data.status || JSON.stringify(data)}`);
    load();
  };

  if (!shop) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Subscription</h1>

      <div className="bg-white shadow rounded p-4">
        <div><span className="font-semibold">Shop:</span> {shop.name}</div>
        <div><span className="font-semibold">Status:</span> {shop.status}</div>
        <div><span className="font-semibold">Trial ends:</span> {shop.trial_ends_at || "—"}</div>
        <div><span className="font-semibold">Subscription period ends:</span> {shop.subscription_end || shop.period_end || "—"}</div>
        <div><span className="font-semibold">Monthly fee:</span> KES {shop.monthly_fee}</div>
      </div>

      <form onSubmit={startPayment} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Pay Subscription via M-Pesa</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder="2547XXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button className="bg-green-600 text-white rounded px-4">Pay</button>
        </div>
        {checkoutId && (
          <button type="button" onClick={checkStatus} className="bg-blue-600 text-white rounded px-3 py-1 text-sm">
            Check payment status
          </button>
        )}
        {status && <div className="text-green-700 text-sm">{status}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <p className="text-xs text-gray-500">
          Once payment is confirmed, your shop access is restored automatically — no manual action needed.
        </p>
      </form>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Payment History</h2>
        <div className="divide-y">
          {payments.map((p) => (
            <div key={p.id} className="py-2 text-sm flex justify-between">
              <span>{p.paid_at} · {p.method} {p.receipt_number ? `(${p.receipt_number})` : ""}</span>
              <span>KES {p.amount}</span>
            </div>
          ))}
          {payments.length === 0 && <div className="text-gray-500 text-sm">No payments yet.</div>}
        </div>
      </div>
    </div>
  );
}
