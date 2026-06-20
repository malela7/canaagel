import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Badge from "../components/Badge";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

export default function DeliveryPage() {
  const [records, setRecords] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [transporterName, setTransporterName] = useState("");
  const [transporterPhone, setTransporterPhone] = useState("");
  const [date, setDate] = useState("");
  const [tab, setTab] = useState("pending");

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

  const assignTransporter = async (record, transporterId) => {
    await api.patch(`/delivery/records/${record.id}/`, { transporter: transporterId || null });
    loadList(date);
  };

  const visibleRecords = useMemo(
    () => records.filter((r) => (tab === "completed" ? r.is_completed : !r.is_completed)),
    [records, tab]
  );

  const grouped = useMemo(() => {
    const groups = {};
    visibleRecords.forEach((r) => {
      const key = r.transporter ? String(r.transporter) : "unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [visibleRecords]);

  const transporterName_ = (id) => transporters.find((t) => t.id === id)?.name || "Unassigned";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Delivery</h1>

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Daily Delivery List</h2>
        <div className="flex gap-2 mb-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" className="border rounded px-2 py-1" value={date}
              onChange={(e) => { setDate(e.target.value); loadList(e.target.value); }} />
          </div>
          <button onClick={() => loadList(date)} className="bg-green-600 text-white rounded px-3 py-1">Refresh</button>
        </div>

        <div className="flex gap-2 mb-3">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded text-sm ${tab === t.key ? "bg-green-600 text-white" : "bg-white border"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className="text-gray-500 text-sm">No deliveries in this view.</div>
        )}

        {Object.entries(grouped).map(([key, group]) => (
          <div key={key} className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {key === "unassigned" ? "Unassigned" : transporterName_(Number(key))}
            </div>
            <div className="space-y-2">
              {group.map((r) => (
                <div key={r.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.customer?.name}</div>
                      <div className="text-sm text-gray-500">{r.customer?.address}</div>
                    </div>
                    {Number(r.customer?.debt_balance) > 0 && (
                      <Badge color="red">KES {r.customer.debt_balance} owed</Badge>
                    )}
                  </div>
                  {r.standing_items && r.standing_items.length > 0 && (
                    <ul className="text-sm text-gray-600 mt-1 list-disc pl-5">
                      {r.standing_items.map((it) => (
                        <li key={it.id}>{it.milk_type_name} {it.pack_size_label} x{it.quantity}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Transporter</label>
                      <select className="border rounded px-2 py-1 text-sm" value={r.transporter || ""}
                        onChange={(e) => assignTransporter(r, e.target.value)}>
                        <option value="">Unassigned</option>
                        {transporters.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={r.is_completed} onChange={() => toggleCompleted(r)} />
                      Completed
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addTransporter} className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold">Transporters</h2>
        {transporters.map((t) => (
          <div key={t.id} className="text-sm text-gray-600">{t.name} — {t.phone_number}</div>
        ))}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input className="border rounded px-2 py-1 w-full" placeholder="e.g. John Mwangi" required
              value={transporterName} onChange={(e) => setTransporterName(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input className="border rounded px-2 py-1 w-full" placeholder="2547XXXXXXXX"
              value={transporterPhone} onChange={(e) => setTransporterPhone(e.target.value)} />
          </div>
          <button className="bg-green-600 text-white rounded px-3 self-end">Add</button>
        </div>
      </form>
    </div>
  );
}
