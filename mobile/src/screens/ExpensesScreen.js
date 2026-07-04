import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ScrollView, Modal, Platform,
} from "react-native";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

const CATEGORIES = ["TRANSPORT", "SALARY", "UTILITY", "MAINTENANCE", "PURCHASE", "OTHER"];

function today() { return new Date().toISOString().slice(0, 10); }

const CAT_COLORS = {
  TRANSPORT: { bg: "#fef9c3", txt: "#854d0e" },
  SALARY: { bg: "#dbeafe", txt: "#1e40af" },
  UTILITY: { bg: "#f3e8ff", txt: "#7e22ce" },
  MAINTENANCE: { bg: "#fee2e2", txt: "#991b1b" },
  PURCHASE: { bg: "#dcfce7", txt: "#166534" },
  OTHER: { bg: "#f3f4f6", txt: "#4b5563" },
};

export default function ExpensesScreen() {
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState({ date: today(), category: "OTHER", amount: "", note: "" });
  const [catIdx, setCatIdx] = useState(CATEGORIES.indexOf("OTHER"));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);

  const load = () =>
    api.get("/sales/expenses/?page_size=200")
      .then((r) => setExpenses(r.data.results || r.data))
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      await api.post("/sales/expenses/", form);
      setForm({ date: today(), category: "OTHER", amount: "", note: "" });
      setCatIdx(CATEGORIES.indexOf("OTHER"));
      load();
      setTab("list");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/sales/expenses/${id}/`).catch(() => {});
    load();
  };

  const selectCategory = (idx) => {
    setCatIdx(idx);
    setForm((f) => ({ ...f, category: CATEGORIES[idx] }));
    setShowCatModal(false);
  };

  const filtered = expenses.filter((ex) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (ex.note || "").toLowerCase().includes(q) || ex.category.toLowerCase().includes(q);
  });

  const total = filtered.reduce((s, ex) => s + parseFloat(ex.amount), 0);

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {["list", "add"].map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && { borderBottomColor: colors.primary }]}
            onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && { color: colors.primary, fontWeight: "700" }]}>
              {t === "list" ? "Expenses" : "+ Add Expense"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Add tab ── */}
      {tab === "add" && (
        <ScrollView contentContainerStyle={s.form}>
          <Text style={s.sectionTitle}>New Expense</Text>

          <Text style={s.label}>Date</Text>
          <TextInput style={s.input} placeholder="YYYY-MM-DD" value={form.date}
            onChangeText={(v) => setForm({ ...form, date: v })} />

          <Text style={s.label}>Category</Text>
          <TouchableOpacity style={[s.catBtn, { borderColor: colors.primary }]}
            onPress={() => setShowCatModal(true)}>
            <View style={[s.catBadge, { backgroundColor: CAT_COLORS[form.category].bg }]}>
              <Text style={[s.catBadgeTxt, { color: CAT_COLORS[form.category].txt }]}>{form.category}</Text>
            </View>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>tap to change ▼</Text>
          </TouchableOpacity>

          <Text style={s.label}>Amount (KES) *</Text>
          <TextInput style={s.input} placeholder="0.00" keyboardType="numeric"
            value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} />

          <Text style={s.label}>Note (optional)</Text>
          <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]}
            placeholder="Description..." multiline
            value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />

          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]}
            onPress={handleAdd} disabled={saving}>
            <Text style={s.btnTxt}>{saving ? "Saving..." : "Save Expense"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── List tab ── */}
      {tab === "list" && (
        <View style={{ flex: 1 }}>
          <View style={s.searchRow}>
            <TextInput style={[s.searchInput, { flex: 1 }]}
              placeholder="Search note / category..."
              value={search} onChangeText={setSearch} />
            {total > 0 && (
              <Text style={s.totalTxt}>KES {total.toLocaleString()}</Text>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(ex) => String(ex.id)}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ color: "#9ca3af" }}>No expenses yet.</Text>
                <TouchableOpacity onPress={() => setTab("add")} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>+ Add first expense</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item: ex }) => {
              const cc = CAT_COLORS[ex.category] || CAT_COLORS.OTHER;
              return (
                <View style={s.card}>
                  <View style={s.cardLeft}>
                    <View style={[s.catBadge, { backgroundColor: cc.bg, marginBottom: 4 }]}>
                      <Text style={[s.catBadgeTxt, { color: cc.txt }]}>{ex.category}</Text>
                    </View>
                    <Text style={s.cardDate}>{ex.date}</Text>
                    {!!ex.note && <Text style={s.cardNote}>{ex.note}</Text>}
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.cardAmount}>KES {parseFloat(ex.amount).toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => handleDelete(ex.id)} style={s.delBtn}>
                      <Text style={s.delBtnTxt}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Category picker modal */}
      <Modal visible={showCatModal} transparent animationType="slide" onRequestClose={() => setShowCatModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCatModal(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Category</Text>
            {CATEGORIES.map((cat, i) => {
              const cc = CAT_COLORS[cat];
              return (
                <TouchableOpacity key={cat} style={[s.modalItem, catIdx === i && { backgroundColor: "#f0fdf4" }]}
                  onPress={() => selectCategory(i)}>
                  <View style={[s.catBadge, { backgroundColor: cc.bg }]}>
                    <Text style={[s.catBadgeTxt, { color: cc.txt }]}>{cat}</Text>
                  </View>
                  {catIdx === i && <Text style={{ color: "#16a34a", fontWeight: "700" }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabTxt: { fontSize: 13, color: "#6b7280" },
  form: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  label: { fontSize: 12, color: "#6b7280" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 10, backgroundColor: "#fff", fontSize: 14 },
  catBtn: { borderWidth: 1.5, borderRadius: 8, padding: 10, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeTxt: { fontSize: 12, fontWeight: "700" },
  btn: { borderRadius: 8, padding: 13, alignItems: "center", marginTop: 8 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff", fontSize: 13 },
  totalTxt: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  card: { backgroundColor: "#fff", marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardLeft: { flex: 1, gap: 2 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  cardDate: { fontSize: 12, color: "#9ca3af" },
  cardNote: { fontSize: 13, color: "#374151" },
  cardAmount: { fontSize: 16, fontWeight: "700", color: "#dc2626" },
  delBtn: { borderWidth: 1, borderColor: "#fca5a5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  delBtnTxt: { fontSize: 11, color: "#dc2626" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 4 },
  modalTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
});
