import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_BY_ROLE = {
  SUPER_ADMIN: [
    { to: "/shops", label: "Shops" },
    { to: "/reports/subscriptions", label: "Subscriptions" },
  ],
  OWNER: [
    { to: "/pos", label: "POS" },
    { to: "/customers", label: "Customers" },
    { to: "/inventory", label: "Inventory" },
    { to: "/delivery", label: "Delivery" },
    { to: "/reports", label: "Reports" },
    { to: "/employees", label: "Employees" },
    { to: "/subscription", label: "Subscription" },
  ],
  EMPLOYEE: [
    { to: "/pos", label: "POS" },
    { to: "/customers", label: "Customers" },
    { to: "/inventory", label: "Inventory" },
    { to: "/delivery", label: "Delivery" },
    { to: "/reports", label: "Reports" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-lg text-green-700">Milkshop SaaS</div>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="text-gray-700 hover:text-green-700">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{user?.username} ({user?.role})</span>
          <button onClick={handleLogout} className="px-3 py-1 rounded bg-red-600 text-white">
            Logout
          </button>
        </div>
      </header>
      <main className="p-4 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
