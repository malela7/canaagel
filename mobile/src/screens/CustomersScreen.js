import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";

const FREQUENCIES = ["NONE", "DAILY", "WEEKDAYS", "CUSTOM"];
const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

const TABS = [
  { key: "all", label: "All" },
  { key: "debt", label: "With debt" },
  { key: "bottles", label: "Bottles out" },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "", house_number: "",
    payment_schedule: "CASH", delivery_frequency: "NONE",
  });
  const [nameError, setNameError] = useState(null);
  const [paymentForm, setPaymentForm] = useState({});

  const load = () => api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const visibleCustomers = useMemo(() => {
    if (tab === "debt") return customers.filter((c) => Number(c.debt_balance) > 0);
    if (tab === "bottles") return customers.filter((c) => c.bottle_tracking && Number(c.bottles_out) > 0);
    return customers;
  }, [customers, tab]);

  const handleCreate = async () => {
    if (!form.name) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    await api.post("/sales/customers/", form);
    setForm({ name: "", phone_number: "", address: "", house_number: "", payment_schedule: "CASH", delivery_frequency: "NONE" });
    load();
  };

  const handleRecordPayment = async (customerId) => {
    const amount = paymentForm[customerId];
    if (!amount) return;
    await api.post("/sales/payments/", { customer: customerId, amount, method: "CASH" });
    setPaymentForm((prev) => ({ ...prev, [customerId]: "" }));
    load();
  };

  return (
    <FlatList
      style={styles.container}
      data={visibleCustomers}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Customers</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Jane Mwangi" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          {nameError && <Text style={styles.fieldError}>{nameError}</Text>}

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} placeholder="2547XXXXXXXX" value={form.phone_number} onChangeText={(v) => setForm({ ...form, phone_number: v })} />

          <Text style={styles.label}>Address <Text style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholder="e.g. Kahawa West" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />

          <Text style={styles.label}>House Number</Text>
          <TextInput style={styles.input} placeholder="e.g. A12" value={form.house_number} onChangeText={(v) => setForm({ ...form, house_number: v })} />

          <Text style={styles.label}>Payment schedule</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={form.payment_schedule} onValueChange={(v) => setForm({ ...form, payment_schedule: v })}>
              {SCHEDULES.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Delivery frequency</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={form.delivery_frequency} onValueChange={(v) => setForm({ ...form, delivery_frequency: v })}>
              {FREQUENCIES.map((f) => <Picker.Item key={f} label={f} value={f} />)}
            </Picker>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleCreate}>
            <Text style={styles.buttonText}>Add Customer</Text>
          </TouchableOpacity>

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={[styles.tab, tab === t.key && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No customers in this view.</Text>}
      renderItem={({ item: c }) => (
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.name}>{c.name}</Text>
            {Number(c.debt_balance) > 0 && (
              <View style={styles.debtBadge}><Text style={styles.debtBadgeText}>KES {c.debt_balance} owed</Text></View>
            )}
          </View>
          <Text style={styles.meta}>{c.phone_number} · {c.payment_schedule}</Text>
          {c.bottle_tracking && <Text style={styles.meta}>Bottles out: {c.bottles_out}</Text>}
          <View style={styles.itemRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Amount"
              keyboardType="numeric"
              value={paymentForm[c.id] || ""}
              onChangeText={(v) => setPaymentForm((prev) => ({ ...prev, [c.id]: v }))}
            />
            <TouchableOpacity style={styles.payButton} onPress={() => handleRecordPayment(c.id)}>
              <Text style={styles.buttonText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  form: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "500", color: "#374151" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, backgroundColor: "#fff", color: "#111827" },
  fieldError: { color: "#dc2626", fontSize: 12 },
  pickerWrap: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  button: { backgroundColor: "#16a34a", borderRadius: 6, padding: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600" },
  tabRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  tabActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  tabText: { color: "#111827", fontSize: 13 },
  tabTextActive: { color: "#fff" },
  empty: { color: "#6b7280", fontSize: 13, textAlign: "center", marginTop: 16 },
  row: { backgroundColor: "#fff", padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 6 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600", fontSize: 16 },
  debtBadge: { backgroundColor: "#fee2e2", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  debtBadgeText: { color: "#b91c1c", fontSize: 11 },
  meta: { color: "#6b7280", fontSize: 13 },
  itemRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  payButton: { backgroundColor: "#2563eb", borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 },
});
