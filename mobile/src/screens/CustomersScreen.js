import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ScrollView, Switch,
} from "react-native";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

export default function CustomersScreen() {
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const [tab, setTab] = useState("list");
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "",
    payment_schedule: "CASH", bottle_tracking: false,
  });
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [scheduleIdx, setScheduleIdx] = useState(0);

  const load = () =>
    api.get("/sales/customers/?page_size=200")
      .then((r) => setCustomers(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/sales/customers/", { ...form, delivery_frequency: "NONE" });
      setForm({ name: "", phone_number: "", address: "", payment_schedule: "CASH", bottle_tracking: false });
      setScheduleIdx(0);
      load();
      setTab("list");
    } finally { setSaving(false); }
  };

  const cycleSchedule = () => {
    const next = (scheduleIdx + 1) % SCHEDULES.length;
    setScheduleIdx(next);
    setForm((f) => ({ ...f, payment_schedule: SCHEDULES[next] }));
  };

  const recordPayment = async (c) => {
    const amount = paymentAmounts[c.id];
    if (!amount) return;
    await api.post("/sales/payments/", { customer: c.id, amount, method: "CASH" });
    setPaymentAmounts((p) => ({ ...p, [c.id]: "" }));
    load();
  };

  const adjustBottles = async (c, delta) => {
    const next = Math.max(0, (c.bottles_out || 0) + delta);
    await api.patch(`/sales/customers/${c.id}/`, { bottles_out: next });
    load();
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone_number || "").includes(q);
  });

  const creditCount = customers.filter((c) => parseFloat(c.debt_balance) > 0).length;

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {["list", "register"].map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && { ...s.tabBtnActive, borderBottomColor: colors.primary }]}
            onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && { color: colors.primary, fontWeight: "700" }]}>
              {t === "list" ? "Customer List" : "Register Customer"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Register tab ── */}
      {tab === "register" && (
        <ScrollView contentContainerStyle={s.form}>
          <Text style={s.sectionTitle}>New Customer</Text>
          <TextInput style={s.input} placeholder="Customer name *"
            value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <TextInput style={s.input} placeholder="Phone (2547XXXXXXXX)" keyboardType="phone-pad"
            value={form.phone_number} onChangeText={(v) => setForm({ ...form, phone_number: v })} />
          <TextInput style={s.input} placeholder="Address / House No."
            value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />

          <Text style={s.label}>Payment Schedule</Text>
          <TouchableOpacity style={[s.scheduleBtn, { borderColor: colors.primary }]} onPress={cycleSchedule}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{form.payment_schedule}</Text>
            <Text style={{ color: "#9ca3af", fontSize: 11 }}>tap to change</Text>
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.label}>Track Bottles</Text>
            <Switch value={form.bottle_tracking}
              onValueChange={(v) => setForm({ ...form, bottle_tracking: v })}
              trackColor={{ false: "#d1d5db", true: colors.primary }}
              thumbColor="#fff" />
          </View>

          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={handleCreate} disabled={saving}>
            <Text style={s.btnTxt}>{saving ? "Saving..." : "+ Add Customer"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Customer List tab ── */}
      {tab === "list" && (
        <View style={{ flex: 1 }}>
          {/* Search + summary */}
          <View style={s.searchRow}>
            <TextInput style={[s.searchInput, { flex: 1 }]}
              placeholder="Search by name or phone..."
              value={search} onChangeText={setSearch} />
            {creditCount > 0 && (
              <View style={s.creditBadge}>
                <Text style={s.creditBadgeTxt}>{creditCount} on credit</Text>
              </View>
            )}
          </View>

          {/* Scrollable table */}
          <ScrollView horizontal>
            <View>
              {/* Header */}
              <View style={[s.row, s.thead]}>
                <Text style={[s.cell, s.cId, s.thTxt]}>ID</Text>
                <Text style={[s.cell, s.cName, s.thTxt]}>Customer Name</Text>
                <Text style={[s.cell, s.cPhone, s.thTxt]}>Phone</Text>
                <Text style={[s.cell, s.cBottles, s.thTxt]}>Bottles</Text>
                <Text style={[s.cell, s.cPay, s.thTxt]}>Payment</Text>
                <Text style={[s.cell, s.cDebt, s.thTxt]}>Debt (KES)</Text>
                <Text style={[s.cell, s.cRecord, s.thTxt]}>Record Payment</Text>
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(c) => String(c.id)}
                renderItem={({ item: c, index }) => {
                  const debt = parseFloat(c.debt_balance) || 0;
                  return (
                    <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd, debt > 0 && s.rowDebt]}>
                      <Text style={[s.cell, s.cId, s.bodyTxt, { color: "#9ca3af" }]}>{c.id}</Text>
                      <View style={[s.cell, s.cName]}>
                        <Text style={[s.bodyTxt, { fontWeight: "600" }]}>{c.name}</Text>
                        {!!c.address && <Text style={{ fontSize: 10, color: "#9ca3af" }}>{c.address}</Text>}
                      </View>
                      <Text style={[s.cell, s.cPhone, s.bodyTxt]}>{c.phone_number || "—"}</Text>
                      <View style={[s.cell, s.cBottles]}>
                        {c.bottle_tracking ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontWeight: "700", color: "#2563eb" }}>{c.bottles_out}</Text>
                            <TouchableOpacity style={s.miniBtn} onPress={() => adjustBottles(c, 1)}>
                              <Text style={{ fontSize: 11, color: "#2563eb" }}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.miniBtn} onPress={() => adjustBottles(c, -1)}>
                              <Text style={{ fontSize: 11, color: "#6b7280" }}>−</Text>
                            </TouchableOpacity>
                          </View>
                        ) : <Text style={{ color: "#d1d5db" }}>—</Text>}
                      </View>
                      <View style={[s.cell, s.cPay]}>
                        <View style={[s.payBadge, { backgroundColor: c.payment_schedule === "CASH" ? "#dcfce7" : "#fed7aa" }]}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: c.payment_schedule === "CASH" ? "#16a34a" : "#c2410c" }}>
                            {c.payment_schedule}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.cell, s.cDebt, s.bodyTxt, { fontWeight: "700", color: debt > 0 ? "#dc2626" : "#16a34a" }]}>
                        {debt > 0 ? debt.toLocaleString() : "✓"}
                      </Text>
                      <View style={[s.cell, s.cRecord, { flexDirection: "row", gap: 4, alignItems: "center" }]}>
                        <TextInput
                          style={s.amtInput}
                          placeholder="Amount"
                          keyboardType="numeric"
                          value={paymentAmounts[c.id] || ""}
                          onChangeText={(v) => setPaymentAmounts((p) => ({ ...p, [c.id]: v }))}
                        />
                        <TouchableOpacity style={[s.recBtn, { backgroundColor: colors.primary }]} onPress={() => recordPayment(c)}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>Record</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 32, alignItems: "center" }}>
                    <Text style={{ color: "#9ca3af" }}>No customers found.</Text>
                  </View>
                }
              />
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: {},
  tabTxt: { fontSize: 13, color: "#6b7280" },
  form: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 10, backgroundColor: "#fff", fontSize: 14 },
  scheduleBtn: { borderWidth: 1.5, borderRadius: 8, padding: 10, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  btn: { borderRadius: 8, padding: 13, alignItems: "center", marginTop: 4 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff", fontSize: 13 },
  creditBadge: { backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  creditBadgeTxt: { color: "#dc2626", fontSize: 11, fontWeight: "700" },
  // Table
  row: { flexDirection: "row", alignItems: "stretch" },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#f9fafb" },
  rowDebt: { borderLeftWidth: 3, borderLeftColor: "#f87171" },
  thead: { backgroundColor: "#4b5563" },
  thTxt: { color: "#fff", fontWeight: "700", fontSize: 11 },
  bodyTxt: { fontSize: 12, color: "#374151" },
  cell: { paddingHorizontal: 8, paddingVertical: 10, justifyContent: "center" },
  cId: { width: 36 },
  cName: { width: 130 },
  cPhone: { width: 120 },
  cBottles: { width: 90 },
  cPay: { width: 80 },
  cDebt: { width: 90 },
  cRecord: { width: 170 },
  payBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  miniBtn: { backgroundColor: "#e5e7eb", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  amtInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 5, width: 70, fontSize: 12, backgroundColor: "#fff" },
  recBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
});
