import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function DeliveryPage() {
  const [records, setRecords] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [transporterName, setTransporterName] = useState("");
  const [transporterPhone, setTransporterPhone] = useState("");
  const [date, setDate] = useState("");

  const loadList = (d) => {
    const qs = d ? `?date=${d}` : "";
    api.get(`/delivery/daily-list/${qs}`).then((r) => setRecords(r.data.results || r.data));
  };

  const loadTransporters = () => {
    api.get("/delivery/transporters/").then((r) => setTransporters(r.data.results || r.data));
  };

  useEffect(() => { loadList(); loadTransporters(); }, []);

  const addTransporter = async (e) => {
    e.preventDefault();
    await api.post("/delivery/transporters/", { name: transporterName, phone_number: transporterPhone });
    setTransporterName("");
    setTransporterPhone("");
    loadTransporters();
  };

  const toggleCompleted = async (record) => {
    await api.patch(`/delivery/records/${record.id}/`, { is_completed: !record.is_completed });
    loadList(date);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Delivery</h1>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Daily Delivery List</h2>
        <div className="flex gap-2 mb-3">
          <input type="date" className="border rounded px-2 py-1" value={date}
            onChange={(e) => { setDate(e.target.value); loadList(e.target.value); }} />
          <button onClick={() => loadList(date)} className="bg-green-600 text-white rounded px-3">Refresh</button>
        </div>
        <div className="divide-y">
          {records.map((r) => (
            <div key={r.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.customer?.name}</div>
                  <div className="text-sm text-gray-500">{r.customer?.address}</div>
                  <div className="text-sm text-gray-500">Debt: KES {r.customer?.debt_balance}
                    {r.customer?.bottle_tracking && ` · Bottles out: ${r.customer?.bottles_out}`}
                  </div>
                  {r.standing_items && r.standing_items.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {r.standing_items.map((it, i) => (
                        <span key={i}>{it.milk_type} {it.pack_size} x{it.quantity}{i < r.standing_items.length - 1 ? ", " : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={r.is_completed} onChange={() => toggleCompleted(r)} />
                  Completed
                </label>
              </div>
            </div>
          ))}
          {records.length === 0 && <div className="text-gray-500 text-sm">No deliveries scheduled.</div>}
        </div>
      </div>

      <form onSubmit={addTransporter} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Transporters</h2>
        {transporters.map((t) => (
          <div key={t.id} className="text-sm text-gray-600">{t.name} — {t.phone_number}</div>
        ))}
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="Name" required
            value={transporterName} onChange={(e) => setTransporterName(e.target.value)} />
          <input className="border rounded px-2 py-1 flex-1" placeholder="Phone"
            value={transporterPhone} onChange={(e) => setTransporterPhone(e.target.value)} />
          <button className="bg-green-600 text-white rounded px-3">Add</button>
        </div>
      </form>
    </div>
  );
}
