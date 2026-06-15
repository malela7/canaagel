import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import POSPage from "./pages/POSPage";
import CustomersPage from "./pages/CustomersPage";
import InventoryPage from "./pages/InventoryPage";
import DeliveryPage from "./pages/DeliveryPage";
import ReportsPage from "./pages/ReportsPage";
import EmployeesPage from "./pages/EmployeesPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ShopsPage from "./pages/ShopsPage";
import SubscriptionsReportPage from "./pages/SubscriptionsReportPage";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "SUPER_ADMIN") return <Navigate to="/shops" replace />;
  return <Navigate to="/pos" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<HomeRedirect />} />

            <Route path="/pos" element={
              <RequireAuth roles={["OWNER", "EMPLOYEE"]}><POSPage /></RequireAuth>
            } />
            <Route path="/customers" element={
              <RequireAuth roles={["OWNER", "EMPLOYEE"]}><CustomersPage /></RequireAuth>
            } />
            <Route path="/inventory" element={
              <RequireAuth roles={["OWNER", "EMPLOYEE"]}><InventoryPage /></RequireAuth>
            } />
            <Route path="/delivery" element={
              <RequireAuth roles={["OWNER", "EMPLOYEE"]}><DeliveryPage /></RequireAuth>
            } />
            <Route path="/reports" element={
              <RequireAuth roles={["OWNER", "EMPLOYEE"]}><ReportsPage /></RequireAuth>
            } />
            <Route path="/employees" element={
              <RequireAuth roles={["OWNER"]}><EmployeesPage /></RequireAuth>
            } />
            <Route path="/subscription" element={
              <RequireAuth roles={["OWNER"]}><SubscriptionPage /></RequireAuth>
            } />

            <Route path="/shops" element={
              <RequireAuth roles={["SUPER_ADMIN"]}><ShopsPage /></RequireAuth>
            } />
            <Route path="/reports/subscriptions" element={
              <RequireAuth roles={["SUPER_ADMIN"]}><SubscriptionsReportPage /></RequireAuth>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
