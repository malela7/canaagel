import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salary" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "OTHER", label: "Other" },
];

const emptyForm = { description: "", amount: "", category: "OTHER" };

export default function ExpensesScreen() {
  const { accent } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    try {
      const res = await api.get("/retail/expenses/");
      const data = res.data.results ?? res.data;
      setExpenses(data);
      setTotal(data.reduce((s, e) => s + parseFloat(e.amount), 0));
    } catch {
      Alert.alert("Error", "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.description.trim()) { Alert.alert("Validation", "Description required."); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert("Validation", "Enter a valid amount."); return; }
    setSaving(true);
    try {
      await api.post("/retail/expenses/", {
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
      });
      setModalVisible(false);
      setForm(emptyForm);
      load();
    } catch {
      Alert.alert("Error", "Could not save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Expense", `Delete "${item.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await api.delete(`/retail/expenses/${item.id}/`); load(); }
          catch { Alert.alert("Error", "Could not delete."); }
        },
      },
    ]);
  };

  const catLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label ?? val;
  const catColor = (val) => {
    const map = { RENT: "#8b5cf6", SALARY: "#3b82f6", UTILITIES: "#f59e0b", TRANSPORT: "#10b981", SUPPLIES: "#ec4899", OTHER: "#6b7280" };
    return map[val] || "#6b7280";
  };

  const s = styles(accent);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Expenses</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(emptyForm); setModalVisible(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Total card */}
      <View style={[s.totalCard, { backgroundColor: accent }]}>
        <Text style={s.totalLabel}>Total Expenses</Text>
        <Text style={s.totalValue}>KES {total.toFixed(2)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} size="large" />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={[s.catDot, { backgroundColor: catColor(item.category) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.description}</Text>
                  <Text style={s.cardSub}>{catLabel(item.category)} · {item.expense_date}</Text>
                </View>
              </View>
              <View style={s.cardRight}>
                <Text style={s.amount}>KES {parseFloat(item.amount).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginTop: 4 }}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
              <Text style={s.emptyText}>No expenses recorded</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Record Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Description *</Text>
              <TextInput style={s.input} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="e.g. Monthly rent" />

              <Text style={s.label}>Amount (KES) *</Text>
              <TextInput style={s.input} value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} keyboardType="decimal-pad" placeholder="0.00" />

              <Text style={s.label}>Category</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.catChip, form.category === c.value && { backgroundColor: accent + "22", borderColor: accent }]}
                    onPress={() => setForm((f) => ({ ...f, category: c.value }))}
                  >
                    <View style={[s.catDot, { backgroundColor: catColor(c.value) }]} />
                    <Text style={[s.catChipText, form.category === c.value && { color: accent, fontWeight: "700" }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: accent }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Expense</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (accent) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: "700", color: "#111827" },
    addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    addBtnText: { color: "#fff", fontWeight: "600" },
    totalCard: { margin: 16, borderRadius: 12, padding: 16 },
    totalLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
    totalValue: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 },
    card: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e5e7eb" },
    cardLeft: { flexDirection: "row", alignItems: "flex-start", flex: 1, gap: 10 },
    catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    cardName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    cardSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    cardRight: { alignItems: "flex-end" },
    amount: { fontSize: 15, fontWeight: "700", color: "#111827" },
    empty: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: "#9ca3af", marginTop: 8, fontSize: 15 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    label: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 4, marginTop: 12 },
    input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb" },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    catChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#f9fafb" },
    catChipText: { fontSize: 13, color: "#374151" },
    saveBtn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
