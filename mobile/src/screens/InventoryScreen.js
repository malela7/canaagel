import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const TABS = ["Milk Types", "Pack Sizes", "Prices", "Stock"];

export default function InventoryScreen() {
  const [tab, setTab] = useState(0);
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [bagStock, setBagStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMilkType, setNewMilkType] = useState("");
  const [newPackSize, setNewPackSize] = useState("");
  const [priceForm, setPriceForm] = useState({ milk_type: "", pack_size: "", amount: "" });
  const [stockEdits, setStockEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [mt, ps, pr, st, bg] = await Promise.all([
        api.get("/inventory/milk-types/"),
        api.get("/inventory/pack-sizes/"),
        api.get("/inventory/prices/"),
        api.get("/inventory/stock/"),
        api.get("/inventory/paper-bag-stock/"),
      ]);
      setMilkTypes(mt.data.results || mt.data);
      setPackSizes(ps.data.results || ps.data);
      setPrices(pr.data.results || pr.data);
      setStock(st.data.results || st.data);
      setBagStock(bg.data.results || bg.data);
    } catch {
      Alert.alert("Error", "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addMilkType = async () => {
    if (!newMilkType.trim()) return;
    try {
      await api.post("/inventory/milk-types/", { name: newMilkType.trim() });
      setNewMilkType("");
      load();
    } catch { Alert.alert("Error", "Could not add milk type."); }
  };

  const addPackSize = async () => {
    if (!newPackSize.trim()) return;
    try {
      await api.post("/inventory/pack-sizes/", { label: newPackSize.trim() });
      setNewPackSize("");
      load();
    } catch { Alert.alert("Error", "Could not add pack size."); }
  };

  const setPrice = async () => {
    if (!priceForm.milk_type || !priceForm.pack_size || !priceForm.amount) {
      Alert.alert("Missing fields", "Select milk type, pack size, and enter amount.");
      return;
    }
    try {
      await api.post("/inventory/prices/set/", priceForm);
      setPriceForm({ milk_type: "", pack_size: "", amount: "" });
      load();
    } catch { Alert.alert("Error", "Could not set price."); }
  };

  const saveStock = async (id, qty) => {
    try {
      await api.patch(`/inventory/stock/${id}/`, { quantity: qty });
    } catch { Alert.alert("Error", "Could not update stock."); }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory</Text>

      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)} style={[styles.tabItem, tab === i && styles.tabItemActive]}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {tab === 0 && (
          <>
            {milkTypes.map((mt) => (
              <View key={mt.id} style={styles.row}>
                <Text style={styles.rowLabel}>{mt.name}</Text>
                <View style={styles.greenBadge}><Text style={styles.greenBadgeText}>Active</Text></View>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="New milk type…" value={newMilkType} onChangeText={setNewMilkType} />
              <TouchableOpacity style={styles.addBtn} onPress={addMilkType}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tab === 1 && (
          <>
            {packSizes.map((ps) => (
              <View key={ps.id} style={styles.row}>
                <Text style={styles.rowLabel}>{ps.label}</Text>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="New pack size… e.g. 2L" value={newPackSize} onChangeText={setNewPackSize} />
              <TouchableOpacity style={styles.addBtn} onPress={addPackSize}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tab === 2 && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>SET PRICE</Text>
              <Text style={styles.label}>Milk type</Text>
              <View style={styles.pickerWrap}>
                {milkTypes.map((mt) => (
                  <TouchableOpacity key={mt.id} onPress={() => setPriceForm({ ...priceForm, milk_type: mt.id })}
                    style={[styles.chip, priceForm.milk_type === mt.id && styles.chipActive]}>
                    <Text style={[styles.chipText, priceForm.milk_type === mt.id && styles.chipTextActive]}>{mt.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Pack size</Text>
              <View style={styles.pickerWrap}>
                {packSizes.map((ps) => (
                  <TouchableOpacity key={ps.id} onPress={() => setPriceForm({ ...priceForm, pack_size: ps.id })}
                    style={[styles.chip, priceForm.pack_size === ps.id && styles.chipActive]}>
                    <Text style={[styles.chipText, priceForm.pack_size === ps.id && styles.chipTextActive]}>{ps.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Price (KES)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 60" value={priceForm.amount} onChangeText={(v) => setPriceForm({ ...priceForm, amount: v })} />
              <TouchableOpacity style={styles.saveBtn} onPress={setPrice}>
                <Text style={styles.saveBtnText}>Set price</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>CURRENT PRICES</Text>
            {prices.map((p) => (
              <View key={p.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{p.milk_type_name} · {p.pack_size_label}</Text>
                </View>
                <Text style={styles.priceText}>KES {p.amount}</Text>
              </View>
            ))}
            {prices.length === 0 && <Text style={styles.empty}>No prices set yet.</Text>}
          </>
        )}

        {tab === 3 && (
          <>
            <Text style={styles.sectionLabel}>STOCK LEVELS</Text>
            {stock.map((s) => {
              const qty = stockEdits[s.id] !== undefined ? stockEdits[s.id] : String(s.quantity);
              const isLow = s.is_low;
              return (
                <View key={s.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{s.milk_type_name} · {s.pack_size_label}</Text>
                    {isLow && <Text style={styles.lowText}>Low stock</Text>}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TextInput
                      style={styles.qtyInput}
                      keyboardType="numeric"
                      value={qty}
                      onChangeText={(v) => setStockEdits({ ...stockEdits, [s.id]: v })}
                      onBlur={() => saveStock(s.id, qty)}
                    />
                    {isLow && <View style={styles.redBadge}><Text style={styles.redBadgeText}>Low</Text></View>}
                  </View>
                </View>
              );
            })}
            {stock.length === 0 && <Text style={styles.empty}>No stock records yet.</Text>}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>PAPER BAGS</Text>
            {bagStock.map((b) => (
              <View key={b.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{b.pack_size_label}</Text>
                  {b.is_low && <Text style={styles.lowText}>Low stock</Text>}
                </View>
                <Text style={styles.priceText}>{b.quantity} pcs</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  tabBar: { flexDirection: "row", backgroundColor: "#e5e7eb", marginHorizontal: 16, borderRadius: 8, padding: 2, marginBottom: 4 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 6 },
  tabItemActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: colors.text, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 12 },
  row: { backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 8, marginBottom: 6 },
  rowLabel: { fontSize: 13, color: colors.text, fontWeight: "500" },
  addRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: "#fff", color: colors.text, marginBottom: 4 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 14, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },
  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  qtyInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 6, width: 56, textAlign: "center", backgroundColor: "#fff", color: colors.text },
  priceText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  lowText: { fontSize: 11, color: "#b91c1c", marginTop: 2 },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 16 },
  greenBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  greenBadgeText: { fontSize: 11, fontWeight: "600", color: "#166534" },
  redBadge: { backgroundColor: "#fee2e2", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  redBadgeText: { fontSize: 11, fontWeight: "600", color: "#b91c1c" },
});
