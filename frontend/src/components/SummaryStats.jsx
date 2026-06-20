import React from "react";

export default function SummaryStats({ items }) {
  return (
    <div className="flex gap-4 flex-wrap mb-4">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-gray-50 border rounded px-4 py-2">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
