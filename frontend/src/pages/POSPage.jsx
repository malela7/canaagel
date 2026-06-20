import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "MPESA", label: "M-Pesa" },
  { key: "BANK", label: "Bank" },
  { key: "OTHER", label: "Other" },
];

export default function POSPage() {
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState({}); // key: `${milk_type}-${pack_size}` -> { milk_type, pack_size, name, label, amount, quantity }
  const [paperBags, setPaperBags] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [step, setStep] = useState("products"); // "products" | "checkout"
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/inventory/prices/"),
      api.get("/inventory/stock/"),
      api.get("/sales/customers/?page_size=100"),
    ]).then(([pricesRes, stockRes, customersRes]) => {
      setPrices(pricesRes.data.results || pricesRes.data);
      setStock(stockRes.data.results || stockRes.data);
      setCustomers(customersRes.data.results || customersRes.data);
    }).catch(() => {
      setError("Failed to load products. Please reload the page.");
    }).finally(() => setLoading(false));
  }, []);

  const stockByCombo = useMemo(() => {
    const map = {};
    stock.forEach((s) => { map[`${s.milk_type}-${s.pack_size}`] = s; });
    return map;
  }, [stock]);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const total = cartItems.reduce((sum, it) => sum + it.amount * it.quantity, 0);

  const addToCart = (price) => {
    const key = `${price.milk_type}-${price.pack_size}`;
    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          milk_type: price.milk_type,
          pack_size: price.pack_size,
          name: price.milk_type_name,
          label: price.pack_size_label,
          amount: Number(price.amount),
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
  };

  const changeQuantity = (key, delta) => {
    setCart((prev) => {
      const item = prev[key];
      if (!item) return prev;
      const quantity = item.quantity + delta;
      if (quantity <= 0) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { ...item, quantity } };
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    try {
      const payload = {
        customer: customerId || null,
        is_walk_in: !customerId,
        paper_bags_used: Number(paperBags) || 0,
        payment_method: paymentMethod,
        items: cartItems.map((it) => ({
          milk_type: it.milk_type,
          pack_size: it.pack_size,
          quantity: it.quantity,
        })),
      };
      const { data } = await api.post("/sales/orders/", payload);
      setMessage(`Order #${data.id} recorded. Total: KES ${data.total_amount} (${data.payment_status})`);
      setCart({});
      setPaperBags("0");
      setStep("products");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not record this sale.");
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading products...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Point of Sale</h1>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Customer (leave blank for walk-in)</label>
        <select
          className="border rounded px-3 py-2 w-full max-w-sm"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Walk-in</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {step === "products" ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Tap a product to add it</h2>
            <div className="text-sm text-gray-600">{cartCount} item{cartCount === 1 ? "" : "s"} in cart</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {prices.map((price) => {
              const combo = stockByCombo[`${price.milk_type}-${price.pack_size}`];
              const outOfStock = combo && Number(combo.quantity) <= 0;
              return (
                <button
                  key={price.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(price)}
                  className={`border rounded p-3 text-center ${outOfStock ? "opacity-50 cursor-not-allowed bg-gray-50" : "bg-white hover:border-green-500"}`}
                >
                  <div className="text-sm font-medium">{price.milk_type_name} {price.pack_size_label}</div>
                  <div className="text-xs text-gray-500">{outOfStock ? "Out of stock" : `KES ${price.amount}`}</div>
                </button>
              );
            })}
            {prices.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">No prices set yet. Set prices on the Inventory page first.</div>
            )}
          </div>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={() => setStep("checkout")}
            className="bg-green-600 text-white rounded px-6 py-2 font-semibold disabled:opacity-50"
          >
            Review cart ({cartCount}) &rarr;
          </button>
        </>
      ) : (
        <div className="bg-white shadow rounded p-4 space-y-4 max-w-lg">
          <button type="button" onClick={() => setStep("products")} className="text-sm text-gray-600">
            &larr; Back to products
          </button>

          <div className="divide-y">
            {cartItems.map((it) => {
              const key = `${it.milk_type}-${it.pack_size}`;
              return (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-sm">{it.name} {it.label}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQuantity(key, -1)} className="w-6 h-6 border rounded">-</button>
                    <span className="text-sm w-6 text-center">{it.quantity}</span>
                    <button type="button" onClick={() => changeQuantity(key, 1)} className="w-6 h-6 border rounded">+</button>
                    <span className="text-sm w-16 text-right">{(it.amount * it.quantity).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>KES {total.toFixed(2)}</span>
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

          <div>
            <label className="block text-sm font-medium mb-2">Payment method</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPaymentMethod(m.key)}
                  className={`border rounded p-2 text-sm ${paymentMethod === m.key ? "border-green-600 bg-green-50 text-green-800" : "bg-white"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white rounded py-2 font-semibold"
          >
            Confirm sale &mdash; KES {total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
