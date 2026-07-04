import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";

const FREQUENCIES = ["NONE", "DAILY", "WEEKDAYS", "CUSTOM"];
const SCHEDULES = ["CASH", "WEEKLY", "MONTHLY"];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: "", phone_number: "", address: "",
    payment_schedule: "CASH", delivery_frequency: "NONE",
  });
  const [paymentForm, setPaymentForm] = useState({});

  const load = () => api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    await api.post("/sales/customers/", form);
    setForm({ name: "", phone_number: "", address: "", payment_schedule: "CASH", delivery_frequency: "NONE" });
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
      data={customers}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Customers</Text>
          <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <TextInput style={styles.input} placeholder="Phone (2547XXXXXXXX)" value={form.phone_number} onChangeText={(v) => setForm({ ...form, phone_number: v })} />
          <TextInput style={styles.input} placeholder="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
          <View style={styles.pickerWrap}>
            <Picker selectedValue={form.payment_schedule} onValueChange={(v) => setForm({ ...form, payment_schedule: v })}>
              {SCHEDULES.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </View>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={form.delivery_frequency} onValueChange={(v) => setForm({ ...form, delivery_frequency: v })}>
              {FREQUENCIES.map((f) => <Picker.Item key={f} label={f} value={f} />)}
            </Picker>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCreate}>
            <Text style={styles.buttonText}>Add Customer</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item: c }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.meta}>{c.phone_number} · {c.payment_schedule} · Debt: KES {c.debt_balance}</Text>
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
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, backgroundColor: "#fff" },
  pickerWrap: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  button: { backgroundColor: "#16a34a", borderRadius: 6, padding: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: { backgroundColor: "#fff", padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 6 },
  name: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#6b7280", fontSize: 13 },
  itemRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  payButton: { backgroundColor: "#2563eb", borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 },
});
