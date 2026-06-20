import React, { useEffect, useState } from "react";
import api from "../api/client";

const PERMS = [
  ["can_use_pos", "Use POS / sell"],
  ["can_manage_customers", "Manage customers"],
  ["can_manage_inventory", "Manage inventory & prices"],
  ["can_view_inventory", "View inventory"],
  ["can_manage_suppliers", "Manage suppliers"],
  ["can_record_payments", "Record customer payments"],
  ["can_manage_delivery", "Manage delivery"],
  ["can_view_reports", "View reports"],
];

const emptyForm = {
  username: "", password: "", first_name: "", last_name: "",
  permissions: PERMS.reduce((acc, [k]) => ({ ...acc, [k]: false }), {}),
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const load = () => api.get("/auth/employees/").then((r) => setEmployees(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/employees/", form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError("Could not create employee. Username may already be taken.");
    }
  };

  const togglePermission = async (employee, flag, label) => {
    const turningOff = !!employee.permissions[flag];
    if (turningOff && !window.confirm(`Remove "${label}" access from ${employee.username}?`)) return;
    const updated = { ...employee.permissions, [flag]: !employee.permissions[flag] };
    await api.patch(`/auth/employees/${employee.id}/`, { permissions: updated });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Employees</h1>

      <form onSubmit={handleCreate} className="bg-white shadow rounded p-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="e.g. jkamau" required
            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Password</label>
          <input type="password" className="border rounded px-3 py-2 w-full" placeholder="Set a password" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">First name</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="e.g. James"
            value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Last name</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="e.g. Kamau"
            value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-1">
          {PERMS.map(([flag, label]) => (
            <label key={flag} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.permissions[flag]}
                onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [flag]: e.target.checked } })} />
              {label}
            </label>
          ))}
        </div>

        {error && <div className="col-span-2 text-red-600 text-sm">{error}</div>}
        <button className="col-span-2 bg-green-600 text-white rounded py-2 font-semibold">Add Employee</button>
      </form>

      <div className="bg-white shadow rounded divide-y">
        {employees.map((emp) => (
          <div key={emp.id} className="p-3">
            <div className="font-medium">{emp.username} {emp.first_name} {emp.last_name}</div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {PERMS.map(([flag, label]) => (
                <label key={flag} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!emp.permissions?.[flag]}
                    onChange={() => togglePermission(emp, flag, label)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
        {employees.length === 0 && <div className="p-3 text-gray-500 text-sm">No employees yet.</div>}
      </div>
    </div>
  );
}
