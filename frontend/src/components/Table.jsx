import React from "react";

export default function Table({ columns, rows }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">No records for this range.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          {columns.map((c) => (
            <th key={c.key} className="py-1 pr-4 font-medium text-gray-600">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b last:border-0">
            {columns.map((c) => (
              <td key={c.key} className="py-1 pr-4">{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
