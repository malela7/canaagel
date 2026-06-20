import React, { useState } from "react";
import api from "../api/client";
import SummaryStats from "../components/SummaryStats";
import Table from "../components/Table";

const REPORTS = [
  { key: "sales", label: "Sales" },
  { key: "debt", label: "Debt" },
  { key: "paper-bags", label: "Paper Bags" },
  { key: "suppliers", label: "Suppliers" },
  { key: "bottles", label: "Bottles" },
];

function SalesReport({ data }) {
  return (
    <>
      <SummaryStats items={[
        { label: "Total Sales", value: data.total_sales },
        { label: "Orders", value: data.order_count },
      ]} />
      <Table
        rows={data.by_item}
        columns={[
          { key: "milk_type__name", label: "Milk Type" },
          { key: "pack_size__label", label: "Pack Size" },
          { key: "total_quantity", label: "Quantity" },
          { key: "total_revenue", label: "Revenue" },
        ]}
      />
    </>
  );
}

function DebtReport({ data }) {
  return (
    <>
      <SummaryStats items={[{ label: "Total Debt", value: data.total_debt }]} />
      <Table
        rows={data.customers}
        columns={[
          { key: "name", label: "Customer" },
          { key: "phone_number", label: "Phone" },
          { key: "debt_balance", label: "Debt" },
        ]}
      />
    </>
  );
}

function PaperBagsReport({ data }) {
  return (
    <>
      <SummaryStats items={[
        { label: "Bought", value: data.bought },
        { label: "Used", value: data.used },
      ]} />
      <Table
        rows={data.remaining}
        columns={[
          { key: "label", label: "Pack Size" },
          { key: "quantity", label: "Remaining" },
          { key: "is_low", label: "Low Stock", render: (r) => (r.is_low ? "Yes" : "No") },
        ]}
      />
    </>
  );
}

function SuppliersReport({ data }) {
  return (
    <>
      <SummaryStats items={[{ label: "Total Cost", value: data.total_cost }]} />
      <Table
        rows={data.by_supplier}
        columns={[
          { key: "supplier__name", label: "Supplier" },
          { key: "kind", label: "Kind" },
          { key: "total_quantity", label: "Quantity" },
          { key: "total_cost", label: "Cost" },
        ]}
      />
    </>
  );
}

function BottlesReport({ data }) {
  return (
    <>
      <SummaryStats items={[{ label: "Total Bottles Out", value: data.total_bottles_out }]} />
      <Table
        rows={data.customers}
        columns={[
          { key: "name", label: "Customer" },
          { key: "bottles_out", label: "Bottles Out" },
        ]}
      />
    </>
  );
}

const REPORT_VIEWS = {
  sales: SalesReport,
  debt: DebtReport,
  "paper-bags": PaperBagsReport,
  suppliers: SuppliersReport,
  bottles: BottlesReport,
};

export default function ReportsPage() {
  const [active, setActive] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (key = active) => {
    setActive(key);
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (from) params.start = from;
      if (to) params.end = to;
      const { data } = await api.get(`/reports/${key}/`, { params });
      setData(data);
    } catch (e) {
      setError("Failed to load report. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const ReportView = REPORT_VIEWS[active];

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
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && data && ReportView && <ReportView data={data} />}
        {!loading && !error && !data && (
          <p className="text-sm text-gray-500">Select a report and click Run.</p>
        )}
      </div>
    </div>
  );
}
