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
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const TABS = ["Milk Types", "Pack Sizes", "Prices", "Stock", "Goods Received"];

const emptyReceipt = { supplier_name: "", date: new Date().toISOString().slice(0, 10) };
const emptyItem = { milk_type: null, pack_size: null, quantity: "", unit_cost: "" };

export default function InventoryScreen() {
  const [tab, setTab] = useState(0);
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [bagStock, setBagStock] = useState([]);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [newMilkType, setNewMilkType] = useState("");
  const [newPackSize, setNewPackSize] = useState("");
  const [priceForm, setPriceForm] = useState({ milk_type: "", pack_size: "", amount: "" });
  const [stockEdits, setStockEdits] = useState({});

  // Goods received
  const [receipt, setReceipt] = useState(emptyReceipt);
  const [receiptItems, setReceiptItems] = useState([{ ...emptyItem }]);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState([]); // local session history

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

  // ── Setup helpers ──────────────────────────────────────
  const addMilkType = async () => {
    if (!newMilkType.trim()) return;
    try {
      await api.post("/inventory/milk-types/", { name: newMilkType.trim() });
      setNewMilkType(""); load();
    } catch { Alert.alert("Error", "Could not add milk type."); }
  };

  const addPackSize = async () => {
    if (!newPackSize.trim()) return;
    try {
      await api.post("/inventory/pack-sizes/", { label: newPackSize.trim() });
      setNewPackSize(""); load();
    } catch { Alert.alert("Error", "Could not add pack size."); }
  };

  const setPrice = async () => {
    if (!priceForm.milk_type || !priceForm.pack_size || !priceForm.amount) {
      Alert.alert("Missing fields", "Select milk type, pack size, and enter amount.");
      return;
    }
    try {
      await api.post("/inventory/prices/set/", priceForm);
      setPriceForm({ milk_type: "", pack_size: "", amount: "" }); load();
    } catch { Alert.alert("Error", "Could not set price."); }
  };

  const saveStock = async (id, qty) => {
    try { await api.patch(`/inventory/stock/${id}/`, { quantity: qty }); }
    catch { Alert.alert("Error", "Could not update stock."); }
  };

  // ── Goods Received helpers ─────────────────────────────
  const updateItem = (idx, key, val) =>
    setReceiptItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const addLine = () => setReceiptItems((prev) => [...prev, { ...emptyItem }]);

  const removeLine = (idx) => {
    if (receiptItems.length === 1) return;
    setReceiptItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitReceipt = async () => {
    // Validate
    for (const it of receiptItems) {
      if (!it.milk_type) { Alert.alert("Validation", "Select a milk type for each line."); return; }
      if (!it.pack_size) { Alert.alert("Validation", "Select a pack size for each line."); return; }
      if (!it.quantity || isNaN(parseFloat(it.quantity)) || parseFloat(it.quantity) <= 0) {
        Alert.alert("Validation", "Enter a valid quantity for each line."); return;
      }
    }

    setSavingReceipt(true);
    try {
      const errors = [];
      const received = [];

      for (const it of receiptItems) {
        // Find the matching stock entry
        const stockEntry = stock.find(
          (s) => String(s.milk_type) === String(it.milk_type) &&
                 String(s.pack_size) === String(it.pack_size)
        );

        if (!stockEntry) {
          const mt = milkTypes.find((m) => String(m.id) === String(it.milk_type));
          const ps = packSizes.find((p) => String(p.id) === String(it.pack_size));
          errors.push(`No stock entry found for ${mt?.name || "?"} / ${ps?.label || "?"}`);
          continue;
        }

        const newQty = parseFloat(stockEntry.quantity) + parseFloat(it.quantity);
        await api.patch(`/inventory/stock/${stockEntry.id}/`, { quantity: newQty });

        const mt = milkTypes.find((m) => String(m.id) === String(it.milk_type));
        const ps = packSizes.find((p) => String(p.id) === String(it.pack_size));
        received.push({
          name: `${mt?.name} / ${ps?.label}`,
          qty: parseFloat(it.quantity),
          unit_cost: it.unit_cost ? parseFloat(it.unit_cost) : null,
        });
      }

      if (errors.length > 0) {
        Alert.alert("Some items skipped", errors.join("\n"));
      }

      if (received.length > 0) {
        // Save to session history
        setReceiptHistory((prev) => [
          {
            id: Date.now(),
            supplier: receipt.supplier_name || "Unknown supplier",
            date: receipt.date,
            items: received,
          },
          ...prev,
        ]);
        setReceipt(emptyReceipt);
        setReceiptItems([{ ...emptyItem }]);
        await load();
        Alert.alert("Success", `Goods received recorded. ${received.length} item(s) updated.`);
      }
    } catch {
      Alert.alert("Error", "Could not save goods received.");
    } finally {
      setSavingReceipt(false);
    }
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

      {/* Tab bar — scrollable so all 5 fit */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)} style={[styles.tabItem, tab === i && styles.tabItemActive]}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>

        {/* ── Milk Types ── */}
        {tab === 0 && (
          <>
            {milkTypes.map((mt) => (
              <View key={mt.id} style={styles.row}>
                <Text style={styles.rowLabel}>{mt.name}</Text>
                <View style={styles.greenBadge}><Text style={styles.greenBadgeText}>Active</Text></View>
              </View>
            ))}
            {milkTypes.length === 0 && <Text style={styles.empty}>No milk types yet.</Text>}
            <View style={styles.addRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="New milk type…" value={newMilkType} onChangeText={setNewMilkType} />
              <TouchableOpacity style={styles.addBtn} onPress={addMilkType}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Pack Sizes ── */}
        {tab === 1 && (
          <>
            {packSizes.map((ps) => (
              <View key={ps.id} style={styles.row}>
                <Text style={styles.rowLabel}>{ps.label}</Text>
              </View>
            ))}
            {packSizes.length === 0 && <Text style={styles.empty}>No pack sizes yet.</Text>}
            <View style={styles.addRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="e.g. 2L" value={newPackSize} onChangeText={setNewPackSize} />
              <TouchableOpacity style={styles.addBtn} onPress={addPackSize}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Prices ── */}
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
                <Text style={styles.rowLabel}>{p.milk_type_name} · {p.pack_size_label}</Text>
                <Text style={styles.priceText}>KES {p.amount}</Text>
              </View>
            ))}
            {prices.length === 0 && <Text style={styles.empty}>No prices set yet.</Text>}
          </>
        )}

        {/* ── Stock ── */}
        {tab === 3 && (
          <>
            <Text style={styles.sectionLabel}>STOCK LEVELS</Text>
            {stock.map((s) => {
              const qty = stockEdits[s.id] !== undefined ? stockEdits[s.id] : String(s.quantity);
              return (
                <View key={s.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{s.milk_type_name} · {s.pack_size_label}</Text>
                    {s.is_low && <Text style={styles.lowText}>⚠ Low stock</Text>}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TextInput
                      style={styles.qtyInput}
                      keyboardType="numeric"
                      value={qty}
                      onChangeText={(v) => setStockEdits({ ...stockEdits, [s.id]: v })}
                      onBlur={() => saveStock(s.id, qty)}
                    />
                    <Text style={styles.unitText}>units</Text>
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
                  {b.is_low && <Text style={styles.lowText}>⚠ Low stock</Text>}
                </View>
                <Text style={styles.priceText}>{b.quantity} pcs</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Goods Received ── */}
        {tab === 4 && (
          <>
            {/* Record form */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>RECORD GOODS RECEIVED</Text>

              <Text style={styles.label}>Supplier name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Brookside Dairy"
                value={receipt.supplier_name}
                onChangeText={(v) => setReceipt({ ...receipt, supplier_name: v })}
              />

              <Text style={styles.label}>Date received</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={receipt.date}
                onChangeText={(v) => setReceipt({ ...receipt, date: v })}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Products received</Text>

              {receiptItems.map((item, idx) => (
                <View key={idx} style={styles.lineCard}>
                  <View style={styles.lineHeader}>
                    <Text style={styles.lineNum}>Line {idx + 1}</Text>
                    {receiptItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeLine(idx)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.label}>Milk type</Text>
                  <View style={styles.pickerWrap}>
                    {milkTypes.map((mt) => (
                      <TouchableOpacity key={mt.id}
                        onPress={() => updateItem(idx, "milk_type", mt.id)}
                        style={[styles.chip, String(item.milk_type) === String(mt.id) && styles.chipActive]}>
                        <Text style={[styles.chipText, String(item.milk_type) === String(mt.id) && styles.chipTextActive]}>{mt.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Pack size</Text>
                  <View style={styles.pickerWrap}>
                    {packSizes.map((ps) => (
                      <TouchableOpacity key={ps.id}
                        onPress={() => updateItem(idx, "pack_size", ps.id)}
                        style={[styles.chip, String(item.pack_size) === String(ps.id) && styles.chipActive]}>
                        <Text style={[styles.chipText, String(item.pack_size) === String(ps.id) && styles.chipTextActive]}>{ps.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Qty received *</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        value={item.quantity}
                        onChangeText={(v) => updateItem(idx, "quantity", v)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Unit cost (KES)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        placeholder="Optional"
                        value={item.unit_cost}
                        onChangeText={(v) => updateItem(idx, "unit_cost", v)}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addLineBtn} onPress={addLine}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addLineBtnText}>Add another product</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { marginTop: 12 }]} onPress={submitReceipt} disabled={savingReceipt}>
                {savingReceipt
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Confirm Goods Received</Text>}
              </TouchableOpacity>
            </View>

            {/* Session history */}
            {receiptHistory.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>RECEIVED THIS SESSION</Text>
                {receiptHistory.map((r) => (
                  <View key={r.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View>
                        <Text style={styles.historySupplier}>{r.supplier}</Text>
                        <Text style={styles.historyDate}>{r.date}</Text>
                      </View>
                      <View style={styles.greenBadge}>
                        <Text style={styles.greenBadgeText}>{r.items.length} item{r.items.length !== 1 ? "s" : ""}</Text>
                      </View>
                    </View>
                    {r.items.map((it, i) => (
                      <View key={i} style={styles.historyLine}>
                        <Text style={styles.historyLineText}>• {it.name}</Text>
                        <Text style={styles.historyLineQty}>+{it.qty}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}

            {receiptHistory.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No goods recorded yet this session</Text>
                <Text style={styles.emptyStateHint}>Use the form above to record deliveries from suppliers</Text>
              </View>
            )}
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

  tabScroll: { flexGrow: 0, marginBottom: 4 },
  tabBar: { paddingHorizontal: 12, gap: 6, paddingVertical: 4 },
  tabItem: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#e5e7eb" },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  row: { backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 8, marginBottom: 6, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  rowLabel: { fontSize: 13, color: colors.text, fontWeight: "500" },

  addRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 9, backgroundColor: "#f9fafb", color: colors.text, marginBottom: 4 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },

  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  qtyInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 6, width: 60, textAlign: "center", backgroundColor: "#fff", color: colors.text },
  unitText: { fontSize: 11, color: colors.textSecondary },
  priceText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  lowText: { fontSize: 11, color: "#b91c1c", marginTop: 2 },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 16 },

  greenBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  greenBadgeText: { fontSize: 11, fontWeight: "600", color: "#166534" },
  redBadge: { backgroundColor: "#fee2e2", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  redBadgeText: { fontSize: 11, fontWeight: "600", color: "#b91c1c" },

  // Goods received
  lineCard: { backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, marginBottom: 10 },
  lineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  lineNum: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  twoCol: { flexDirection: "row", gap: 10 },
  addLineBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, borderStyle: "dashed", marginTop: 6 },
  addLineBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  historyCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colors.primary, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  historySupplier: { fontSize: 14, fontWeight: "700", color: colors.text },
  historyDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  historyLineText: { fontSize: 13, color: colors.text },
  historyLineQty: { fontSize: 13, fontWeight: "700", color: "#16a34a" },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyStateText: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
  emptyStateHint: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
});
