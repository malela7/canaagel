import React from "react";

const COLORS = {
  gray: "bg-gray-100 text-gray-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
};

export default function Badge({ color = "gray", children }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${COLORS[color] || COLORS.gray}`}>
      {children}
    </span>
  );
}
