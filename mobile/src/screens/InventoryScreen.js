import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const AVATAR_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];
const avatarColor = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ── Add Bill Modal ─────────────────────────────────────────
function AddBillModal({ supplier, onSave, onClose }) {
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!total.trim()) { Alert.alert("Missing", "Enter total amount."); return; }
    setSaving(true);
    try {
      await api.post(`/inventory/suppliers/${supplier.id}/bills/`, {
        date,
        total_amount: parseFloat(total) || 0,
        amount_paid: parseFloat(paid) || 0,
        note,
      });
      onSave();
    } catch {
      Alert.alert("Error", "Could not save bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ms.overlay}>
          <TouchableWithoutFeedback>
            <View style={ms.sheet}>
              <View style={ms.handle} />
              <Text style={ms.title}>Add Bill — {supplier?.name}</Text>
              <Text style={ms.sub}>Record a delivery/bill</Text>
              <Text style={ms.lbl}>Date (YYYY-MM-DD)</Text>
              <TextInput style={ms.inp} value={date} onChangeText={setDate} autoFocus />
              <Text style={ms.lbl}>Total amount (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
              <Text style={ms.lbl}>Amount paid (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={paid} onChangeText={setPaid} placeholder="0" />
              <Text style={ms.lbl}>Note</Text>
              <TextInput style={ms.inp} value={note} onChangeText={setNote} placeholder="Optional" />
              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancel} onPress={onClose}>
                  <Text style={ms.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.save} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ms.saveTxt}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────
export default function InventoryScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [billModal, setBillModal] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/suppliers/");
      setSuppliers(res.data.results || res.data);
    } catch {
      Alert.alert("Error", "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSupplier = async () => {
    if (!name.trim()) { Alert.alert("Missing", "Enter supplier name."); return; }
    setAdding(true);
    try {
      await api.post("/inventory/suppliers/", { name: name.trim(), phone: phone.trim(), note: note.trim() });
      setName(""); setPhone(""); setNote(""); load();
    } catch (e) {
      const msg = e?.response?.data?.name?.[0] || "Could not add supplier.";
      Alert.alert("Error", msg);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const filtered = suppliers.filter((sup) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      sup.name.toLowerCase().includes(q) ||
      (sup.phone || "").includes(q) ||
      (sup.note || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={s.root}>
      {billModal && (
        <AddBillModal
          supplier={billModal}
          onSave={() => { setBillModal(null); load(); }}
          onClose={() => setBillModal(null)}
        />
      )}

      <ScrollView contentContainerStyle={s.padded}>
        {/* Register form */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>REGISTER SUPPLIER</Text>
          <TextInput style={s.input} placeholder="Supplier name *" value={name} onChangeText={setName} />
          <TextInput style={[s.input, { marginTop: 8 }]} placeholder="Phone number (optional)"
            keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput
            style={[s.input, { marginTop: 8, height: 68, textAlignVertical: "top" }]}
            placeholder="Goods / products they supply (e.g. Fresh milk, Yoghurt)"
            multiline value={note} onChangeText={setNote}
          />
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 10 }]} onPress={addSupplier} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>+ Register Supplier</Text>}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          style={[s.input, { marginBottom: 10 }]}
          placeholder="Search by name, phone or goods..."
          value={search} onChangeText={setSearch}
        />

        {/* List */}
        <Text style={s.sectionLabel}>SUPPLIERS ({filtered.length})</Text>
        {filtered.length === 0 && <Text style={s.empty}>No suppliers found.</Text>}
        {filtered.map((sup, i) => {
          const owed = sup.total_owed ?? 0;
          const isOpen = expanded === sup.id;
          return (
            <View key={sup.id} style={s.card}>
              <TouchableOpacity style={s.supRow} onPress={() => setExpanded(isOpen ? null : sup.id)}>
                <View style={[s.avatar, { backgroundColor: avatarColor(i) }]}>
                  <Text style={s.avatarTxt}>{(sup.name || "?").slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.supName}>{sup.name}</Text>
                  {sup.phone ? <Text style={s.supPhone}>{sup.phone}</Text> : null}
                  {sup.note ? <Text style={s.supGoods} numberOfLines={1}>📦 {sup.note}</Text> : null}
                </View>
                {Number(owed) > 0 && (
                  <View style={s.owedBadge}>
                    <Text style={s.owedTxt}>KES {Number(owed).toLocaleString()}</Text>
                  </View>
                )}
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {isOpen && (
                <View style={{ marginTop: 10 }}>
                  {(sup.bills || []).length === 0 && <Text style={s.empty}>No bills yet.</Text>}
                  {(sup.bills || []).map((bill) => (
                    <View key={bill.id} style={s.billRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.billDate}>{bill.date}</Text>
                        {bill.note ? <Text style={s.billNote}>{bill.note}</Text> : null}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={s.billTotal}>KES {Number(bill.total_amount).toLocaleString()}</Text>
                        {Number(bill.balance) > 0
                          ? <Text style={s.billBalance}>Owed: {Number(bill.balance).toLocaleString()}</Text>
                          : <Text style={s.billPaid}>Paid</Text>}
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={s.addBillBtn} onPress={() => setBillModal(sup)}>
                    <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                    <Text style={s.addBillTxt}>Add Bill</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  padded: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", color: "#111827", fontSize: 14 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 13, alignItems: "center", marginTop: 6 },
  primaryBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 8 },

  supRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  supName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  supPhone: { fontSize: 12, color: "#6b7280" },
  supGoods: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  owedBadge: { backgroundColor: "#fee2e2", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  owedTxt: { fontSize: 11, fontWeight: "700", color: "#b91c1c" },

  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  billDate: { fontSize: 13, fontWeight: "600", color: "#111827" },
  billNote: { fontSize: 11, color: "#9ca3af" },
  billTotal: { fontSize: 13, fontWeight: "700", color: "#111827" },
  billBalance: { fontSize: 11, fontWeight: "600", color: "#ef4444" },
  billPaid: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  addBillBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, borderStyle: "dashed", marginTop: 10 },
  addBillTxt: { fontSize: 13, color: colors.primary, fontWeight: "600" },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  lbl: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 10, marginBottom: 4 },
  inp: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", fontSize: 16, color: "#111827" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancel: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, alignItems: "center" },
  cancelTxt: { color: "#6b7280", fontWeight: "600" },
  save: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
