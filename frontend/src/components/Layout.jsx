import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
    { to: "/expenses", label: "Expenses" },
    { to: "/delivery", label: "Delivery" },
    { to: "/reports", label: "Reports" },
    { to: "/employees", label: "Employees" },
    { to: "/subscription", label: "Subscription" },
  ],
  EMPLOYEE: [
    { to: "/pos", label: "POS" },
    { to: "/customers", label: "Customers" },
    { to: "/inventory", label: "Inventory" },
    { to: "/expenses", label: "Expenses" },
    { to: "/delivery", label: "Delivery" },
    { to: "/reports", label: "Reports" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = NAV_BY_ROLE[user?.role] || [];
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-14" : "w-52"} bg-white shadow-md flex flex-col transition-all duration-200 min-h-screen`}>
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b">
          {!collapsed && <span className="font-bold text-green-700 text-base">Milkshop</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-green-700 ml-auto">
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {links.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
                  ${active ? "bg-green-600 text-white" : "text-gray-700 hover:bg-green-50 hover:text-green-700"}`}
              >
                <span className="w-4 shrink-0 text-center">•</span>
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t p-3">
          {!collapsed && (
            <div className="text-xs text-gray-500 mb-2 truncate">{user?.username} ({user?.role})</div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full bg-red-600 text-white rounded py-1 text-sm"
          >
            {collapsed ? "×" : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow px-4 py-3">
          <span className="font-semibold text-gray-700">
            {links.find((l) => location.pathname.startsWith(l.to))?.label || "Dashboard"}
          </span>
        </header>
        <main className="p-4 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
