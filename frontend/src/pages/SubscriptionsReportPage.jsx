import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function SubscriptionsReportPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/subscriptions/").then((r) => setData(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Subscriptions Overview</h1>
      <div className="bg-white shadow rounded p-4">
        <pre className="text-sm whitespace-pre-wrap">{data ? JSON.stringify(data, null, 2) : "Loading..."}</pre>
      </div>
    </div>
  );
}
