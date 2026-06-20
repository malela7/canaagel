import React, { useEffect, useState } from "react";
import api from "../api/client";
import SummaryStats from "../components/SummaryStats";
import Table from "../components/Table";

export default function SubscriptionsReportPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/reports/subscriptions/")
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load subscriptions overview."));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const statusEntries = Object.entries(data.shop_counts || {});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Subscriptions Overview</h1>

      <SummaryStats items={[
        { label: "Total Shops", value: data.total_shops },
        ...statusEntries.map(([status, count]) => ({ label: status, value: count })),
      ]} />

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Recent Payments</h2>
        <Table
          rows={data.recent_payments || []}
          columns={[
            { key: "shop", label: "Shop" },
            { key: "amount", label: "Amount", render: (r) => `KES ${r.amount}` },
            { key: "method", label: "Method" },
            { key: "paid_at", label: "Paid At" },
          ]}
        />
      </div>
    </div>
  );
}
