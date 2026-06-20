import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import Badge from "../components/Badge";

const STATUS_COLORS = {
  TRIAL: "blue",
  ACTIVE: "green",
  SUSPENDED: "red",
  EXPIRED: "amber",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function SubscriptionPage() {
  const [shop, setShop] = useState(null);
  const [payments, setPayments] = useState([]);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);
  const pollRef = useRef(null);

  const load = () => {
    api.get("/shops/me/").then((r) => setShop(r.data));
    api.get("/shops/subscription-payments/").then((r) => setPayments(r.data.results || r.data));
  };

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, []);

  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const checkStatus = async (id) => {
    const { data } = await api.get("/shops/mpesa/stk-status/", { params: { checkout_request_id: id } });
    const currentStatus = data.status;
    setStatus(`Status: ${currentStatus || JSON.stringify(data)}`);
    load();
    if (currentStatus && currentStatus !== "PENDING") {
      stopPolling();
    }
  };

  const startPayment = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    stopPolling();
    try {
      const { data } = await api.post("/shops/mpesa/stk-push/", { phone_number: phone });
      const id = data.checkout_request_id || data.CheckoutRequestID;
      setCheckoutId(id);
      setStatus("STK push sent. Enter your M-Pesa PIN on your phone to complete payment.");
      pollRef.current = setInterval(() => checkStatus(id), 4000);
    } catch (err) {
      setError("Could not start payment. Check the phone number and try again.");
    }
  };

  if (!shop) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Subscription</h1>

      <div className="bg-white shadow rounded p-4 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Shop:</span> {shop.name}
          <Badge color={STATUS_COLORS[shop.status] || "gray"}>{shop.status}</Badge>
        </div>
        <div><span className="font-semibold">Trial ends:</span> {formatDate(shop.trial_ends_at)}</div>
        <div><span className="font-semibold">Subscription period ends:</span> {formatDate(shop.subscription_end || shop.period_end)}</div>
        <div><span className="font-semibold">Monthly fee:</span> KES {shop.monthly_fee}</div>
      </div>

      <form onSubmit={startPayment} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Pay Subscription via M-Pesa</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder="2547XXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button className="bg-green-600 text-white rounded px-4">Pay</button>
        </div>
        {status && <div className="text-green-700 text-sm flex items-center gap-2">
          {pollRef.current && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          {status}
        </div>}
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
              <span>{formatDate(p.paid_at)} · {p.method} {p.receipt_number ? `(${p.receipt_number})` : ""}</span>
              <span>KES {p.amount}</span>
            </div>
          ))}
          {payments.length === 0 && <div className="text-gray-500 text-sm">No payments yet.</div>}
        </div>
      </div>
    </div>
  );
}
