import React, { useState } from "react";
import api from "../api/client";

const REPORTS = [
  { key: "sales", label: "Sales" },
  { key: "debt", label: "Debt" },
  { key: "paper-bags", label: "Paper Bags" },
  { key: "suppliers", label: "Suppliers" },
  { key: "bottles", label: "Bottles" },
];

export default function ReportsPage() {
  const [active, setActive] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);

  const load = async (key = active) => {
    setActive(key);
    const params = {};
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    const { data } = await api.get(`/reports/${key}/`, { params });
    setData(data);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>

      <div className="flex gap-2 flex-wrap">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => load(r.key)}
            className={`px-3 py-1 rounded ${active === r.key ? "bg-green-600 text-white" : "bg-white border"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">From</label>
          <input type="date" className="border rounded px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" className="border rounded px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => load()} className="bg-blue-600 text-white rounded px-3 py-1">Run</button>
      </div>

      <div className="bg-white shadow rounded p-4">
        <pre className="text-sm whitespace-pre-wrap">{data ? JSON.stringify(data, null, 2) : "Select a report and click Run."}</pre>
      </div>
    </div>
  );
}
