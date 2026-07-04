import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

// ── Constants ──────────────────────────────────────────────
const TABS = ["Milk Types", "Pack Sizes", "Prices", "Stock", "Goods Received"];

const AVATAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#ef4444", "#06b6d4", "#84cc16",
];

const STOCK_FILTERS = [
  { key: "all", label: "All" },
  { key: "in_stock", label: "In Stock" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
  { key: "category", label: "By Category" },
];

const emptyReceipt = { supplier_name: "", date: new Date().toISOString().slice(0, 10) };
const emptyReceiptItem = { milk_type: null, pack_size: null, quantity: "", unit_cost: "" };

// ── Helpers ────────────────────────────────────────────────
const avatarColor = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

const makeSKU = (milkName = "", packLabel = "") => {
  const m = milkName.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const p = packLabel.replace(/\s+/g, "").toUpperCase();
  return `${m}-${p}`;
};

const statusInfo = (qty, threshold) => {
  const q = parseFloat(qty);
  const t = parseFloat(threshold);
  if (q <= 0) return { label: "Out of Stock", dot: "#ef4444", badge: "#fee2e2", badgeText: "#b91c1c" };
  if (t > 0 && q <= t) return { label: "Low Stock", dot: "#f59e0b", badge: "#fef3c7", badgeText: "#92400e" };
  return { label: "In Stock", dot: "#22c55e", badge: "#dcfce7", badgeText: "#166534" };
};

// ── Edit Modal ─────────────────────────────────────────────
function EditStockModal({ item, milkTypes, onSave, onClose }) {
  const [qty, setQty] = useState(String(item?.quantity ?? ""));
  const [threshold, setThreshold] = useState(String(item?.low_stock_threshold ?? "0"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/inventory/stock/${item.id}/`, {
        quantity: parseFloat(qty) || 0,
        low_stock_threshold: parseFloat(threshold) || 0,
      });
      onSave();
    } catch {
      Alert.alert("Error", "Could not update stock.");
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
              <Text style={ms.title}>Edit Stock</Text>
              <Text style={ms.subtitle}>{item?.milk_type_name} · {item?.pack_size_label}</Text>
              <Text style={ms.sku}>SKU: {makeSKU(item?.milk_type_name, item?.pack_size_label)}</Text>

              <Text style={ms.label}>Current quantity (units)</Text>
              <TextInput
                style={ms.input}
                keyboardType="decimal-pad"
                value={qty}
                onChangeText={setQty}
                autoFocus
              />

              <Text style={ms.label}>Low stock alert threshold</Text>
              <TextInput
                style={ms.input}
                keyboardType="decimal-pad"
                value={threshold}
                onChangeText={setThreshold}
                placeholder="0 = no alert"
              />

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                  <Text style={ms.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.saveBtn} onPress={save} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={ms.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 2 },
  sku: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", fontSize: 16, color: "#111827" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, alignItems: "center" },
  cancelText: { color: "#6b7280", fontWeight: "600" },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// ── Swipeable Stock Row ────────────────────────────────────
function StockRow({ item, index, onEdit, onDelete }) {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();

  const status = statusInfo(item.quantity, item.low_stock_threshold);
  const sku = makeSKU(item.milk_type_name, item.pack_size_label);
  const color = avatarColor(index);
  const initial = (item.milk_type_name || "?").slice(0, 2).toUpperCase();

  const renderRight = (progress, drag) => {
    const scale = drag.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.8], extrapolate: "clamp" });
    return (
      <Animated.View style={[sw.actionRight, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={sw.editBtn}
          onPress={() => { close(); onEdit(item); }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={sw.actionLabel}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeft = (progress, drag) => {
    const scale = drag.interpolate({ inputRange: [0, 80], outputRange: [0.8, 1], extrapolate: "clamp" });
    return (
      <Animated.View style={[sw.actionLeft, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={sw.deleteBtn}
          onPress={() => {
            close();
            Alert.alert(
              "Remove stock entry?",
              `Remove "${item.milk_type_name} ${item.pack_size_label}" from inventory?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => onDelete(item) },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={sw.actionLabel}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderRightActions={renderRight}
      renderLeftActions={renderLeft}
    >
      <View style={sw.row}>
        {/* Avatar */}
        <View style={[sw.avatar, { backgroundColor: color }]}>
          <Text style={sw.avatarText}>{initial}</Text>
        </View>

        {/* Name + SKU */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={sw.name} numberOfLines={1}>
            {item.milk_type_name}
          </Text>
          <Text style={sw.packSize}>{item.pack_size_label}</Text>
          <Text style={sw.sku}>{sku}</Text>
        </View>

        {/* Quantity badge */}
        <View style={[sw.qtyBadge, { backgroundColor: status.badge }]}>
          <Text style={[sw.qtyText, { color: status.badgeText }]}>
            {parseFloat(item.quantity) % 1 === 0
              ? parseInt(item.quantity)
              : parseFloat(item.quantity).toFixed(1)}
          </Text>
          <Text style={[sw.qtyUnit, { color: status.badgeText }]}>units</Text>
        </View>

        {/* Status dot */}
        <View style={sw.dotWrap}>
          <View style={[sw.dot, { backgroundColor: status.dot }]} />
        </View>
      </View>
    </Swipeable>
  );
}

const sw = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  avatar: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  name: { fontSize: 14, fontWeight: "700", color: "#111827" },
  packSize: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  sku: { fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginTop: 1 },
  qtyBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, alignItems: "center", marginRight: 10 },
  qtyText: { fontSize: 16, fontWeight: "800", lineHeight: 20 },
  qtyUnit: { fontSize: 9, fontWeight: "600", marginTop: -2 },
  dotWrap: { width: 16, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actionRight: { width: 80, justifyContent: "center" },
  actionLeft: { width: 80, justifyContent: "center" },
  editBtn: { flex: 1, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", gap: 2 },
  deleteBtn: { flex: 1, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", gap: 2 },
  actionLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ── Main Screen ────────────────────────────────────────────
export default function InventoryScreen() {
  const [tab, setTab] = useState(3); // Default to Stock tab
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [bagStock, setBagStock] = useState([]);
  const [loading, setLoading] = useState(true);

  // Setup
  const [newMilkType, setNewMilkType] = useState("");
  const [newPackSize, setNewPackSize] = useState("");
  const [priceForm, setPriceForm] = useState({ milk_type: "", pack_size: "", amount: "" });

  // Stock tab filter/search
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryId, setCategoryId] = useState(null);
  const [editItem, setEditItem] = useState(null);

  // Goods received
  const [receipt, setReceipt] = useState(emptyReceipt);
  const [receiptItems, setReceiptItems] = useState([{ ...emptyReceiptItem }]);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState([]);

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

  // ── Filtered stock list ─────────────────────────────────
  const filteredStock = useMemo(() => {
    let list = stock;

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.milk_type_name?.toLowerCase().includes(q) ||
          s.pack_size_label?.toLowerCase().includes(q) ||
          makeSKU(s.milk_type_name, s.pack_size_label).toLowerCase().includes(q)
      );
    }

    // status filter
    if (filter === "out") list = list.filter((s) => parseFloat(s.quantity) <= 0);
    else if (filter === "low") list = list.filter((s) => s.is_low && parseFloat(s.quantity) > 0);
    else if (filter === "in_stock") list = list.filter((s) => !s.is_low && parseFloat(s.quantity) > 0);
    else if (filter === "category" && categoryId) list = list.filter((s) => String(s.milk_type) === String(categoryId));

    return list;
  }, [stock, search, filter, categoryId]);

  // Stock summary counts
  const stockSummary = useMemo(() => ({
    total: stock.length,
    inStock: stock.filter((s) => !s.is_low && parseFloat(s.quantity) > 0).length,
    low: stock.filter((s) => s.is_low && parseFloat(s.quantity) > 0).length,
    out: stock.filter((s) => parseFloat(s.quantity) <= 0).length,
  }), [stock]);

  // ── Setup helpers ───────────────────────────────────────
  const addMilkType = async () => {
    if (!newMilkType.trim()) return;
    try { await api.post("/inventory/milk-types/", { name: newMilkType.trim() }); setNewMilkType(""); load(); }
    catch { Alert.alert("Error", "Could not add milk type."); }
  };

  const addPackSize = async () => {
    if (!newPackSize.trim()) return;
    try { await api.post("/inventory/pack-sizes/", { label: newPackSize.trim() }); setNewPackSize(""); load(); }
    catch { Alert.alert("Error", "Could not add pack size."); }
  };

  const setPrice = async () => {
    if (!priceForm.milk_type || !priceForm.pack_size || !priceForm.amount) {
      Alert.alert("Missing fields", "Select milk type, pack size, and enter amount."); return;
    }
    try { await api.post("/inventory/prices/set/", priceForm); setPriceForm({ milk_type: "", pack_size: "", amount: "" }); load(); }
    catch { Alert.alert("Error", "Could not set price."); }
  };

  const deleteStock = async (item) => {
    try {
      await api.delete(`/inventory/stock/${item.id}/`);
      load();
    } catch {
      Alert.alert("Error", "Could not remove stock entry.");
    }
  };

  // ── Goods received helpers ──────────────────────────────
  const updateRI = (idx, key, val) =>
    setReceiptItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const submitReceipt = async () => {
    for (const it of receiptItems) {
      if (!it.milk_type) { Alert.alert("Validation", "Select a milk type for each line."); return; }
      if (!it.pack_size) { Alert.alert("Validation", "Select a pack size for each line."); return; }
      if (!it.quantity || parseFloat(it.quantity) <= 0) { Alert.alert("Validation", "Enter valid quantity."); return; }
    }
    setSavingReceipt(true);
    try {
      const errors = [], received = [];
      for (const it of receiptItems) {
        const stockEntry = stock.find(
          (s) => String(s.milk_type) === String(it.milk_type) && String(s.pack_size) === String(it.pack_size)
        );
        if (!stockEntry) {
          const mt = milkTypes.find((m) => String(m.id) === String(it.milk_type));
          const ps = packSizes.find((p) => String(p.id) === String(it.pack_size));
          errors.push(`No stock for ${mt?.name}/${ps?.label}`);
          continue;
        }
        await api.patch(`/inventory/stock/${stockEntry.id}/`, { quantity: parseFloat(stockEntry.quantity) + parseFloat(it.quantity) });
        const mt = milkTypes.find((m) => String(m.id) === String(it.milk_type));
        const ps = packSizes.find((p) => String(p.id) === String(it.pack_size));
        received.push({ name: `${mt?.name}/${ps?.label}`, qty: parseFloat(it.quantity) });
      }
      if (errors.length) Alert.alert("Some items skipped", errors.join("\n"));
      if (received.length) {
        setReceiptHistory((prev) => [{ id: Date.now(), supplier: receipt.supplier_name || "Unknown", date: receipt.date, items: received }, ...prev]);
        setReceipt(emptyReceipt);
        setReceiptItems([{ ...emptyReceiptItem }]);
        await load();
        Alert.alert("Saved", `${received.length} item(s) updated.`);
      }
    } catch { Alert.alert("Error", "Could not save goods received."); }
    finally { setSavingReceipt(false); }
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      {/* Edit modal */}
      {editItem && (
        <EditStockModal
          item={editItem}
          milkTypes={milkTypes}
          onSave={() => { setEditItem(null); load(); }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Top header */}
      <View style={s.header}>
        <Text style={s.title}>Inventory</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)} style={[s.tabChip, tab === i && s.tabChipActive]}>
            <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Milk Types ── */}
      {tab === 0 && (
        <ScrollView contentContainerStyle={s.padded}>
          {milkTypes.map((mt, i) => (
            <View key={mt.id} style={s.simpleRow}>
              <View style={[s.miniAvatar, { backgroundColor: avatarColor(i) }]}>
                <Text style={s.miniAvatarText}>{mt.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={s.rowLabel}>{mt.name}</Text>
              <View style={s.greenBadge}><Text style={s.greenBadgeText}>Active</Text></View>
            </View>
          ))}
          {milkTypes.length === 0 && <Text style={s.empty}>No milk types yet.</Text>}
          <View style={s.addRow}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="New milk type e.g. Cow" value={newMilkType} onChangeText={setNewMilkType} />
            <TouchableOpacity style={s.addBtn} onPress={addMilkType}><Text style={s.addBtnText}>Add</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Pack Sizes ── */}
      {tab === 1 && (
        <ScrollView contentContainerStyle={s.padded}>
          {packSizes.map((ps) => (
            <View key={ps.id} style={s.simpleRow}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[s.rowLabel, { marginLeft: 10 }]}>{ps.label}</Text>
              {ps.litres && <Text style={s.meta}>{ps.litres}L</Text>}
            </View>
          ))}
          {packSizes.length === 0 && <Text style={s.empty}>No pack sizes yet.</Text>}
          <View style={s.addRow}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="e.g. 2L" value={newPackSize} onChangeText={setNewPackSize} />
            <TouchableOpacity style={s.addBtn} onPress={addPackSize}><Text style={s.addBtnText}>Add</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Prices ── */}
      {tab === 2 && (
        <ScrollView contentContainerStyle={s.padded}>
          <View style={s.card}>
            <Text style={s.sectionLabel}>SET PRICE</Text>
            <Text style={s.label}>Milk type</Text>
            <View style={s.chipRow}>
              {milkTypes.map((mt) => (
                <TouchableOpacity key={mt.id} onPress={() => setPriceForm({ ...priceForm, milk_type: mt.id })}
                  style={[s.chip, priceForm.milk_type === mt.id && s.chipActive]}>
                  <Text style={[s.chipText, priceForm.milk_type === mt.id && s.chipTextActive]}>{mt.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Pack size</Text>
            <View style={s.chipRow}>
              {packSizes.map((ps) => (
                <TouchableOpacity key={ps.id} onPress={() => setPriceForm({ ...priceForm, pack_size: ps.id })}
                  style={[s.chip, priceForm.pack_size === ps.id && s.chipActive]}>
                  <Text style={[s.chipText, priceForm.pack_size === ps.id && s.chipTextActive]}>{ps.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Price (KES)</Text>
            <TextInput style={s.input} keyboardType="numeric" placeholder="e.g. 60" value={priceForm.amount}
              onChangeText={(v) => setPriceForm({ ...priceForm, amount: v })} />
            <TouchableOpacity style={s.primaryBtn} onPress={setPrice}>
              <Text style={s.primaryBtnText}>Set price</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sectionLabel}>CURRENT PRICES</Text>
          {prices.map((p) => (
            <View key={p.id} style={s.simpleRow}>
              <Text style={s.rowLabel}>{p.milk_type_name} · {p.pack_size_label}</Text>
              <Text style={s.priceText}>KES {p.amount}</Text>
            </View>
          ))}
          {prices.length === 0 && <Text style={s.empty}>No prices set yet.</Text>}
        </ScrollView>
      )}

      {/* ── Stock ── */}
      {tab === 3 && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or SKU…"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
            {STOCK_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => { setFilter(f.key); if (f.key !== "category") setCategoryId(null); }}
                style={[s.filterChip, filter === f.key && s.filterChipActive]}
              >
                {f.key === "low" && <View style={[s.filterDot, { backgroundColor: "#f59e0b" }]} />}
                {f.key === "out" && <View style={[s.filterDot, { backgroundColor: "#ef4444" }]} />}
                {f.key === "in_stock" && <View style={[s.filterDot, { backgroundColor: "#22c55e" }]} />}
                <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category sub-chips */}
          {filter === "category" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
              {milkTypes.map((mt, i) => (
                <TouchableOpacity
                  key={mt.id}
                  onPress={() => setCategoryId(categoryId === mt.id ? null : mt.id)}
                  style={[s.catChip, { borderColor: avatarColor(i) }, categoryId === mt.id && { backgroundColor: avatarColor(i) }]}
                >
                  <Text style={[s.catChipText, categoryId === mt.id && { color: "#fff" }]}>{mt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Summary banner */}
          <View style={s.summaryBanner}>
            <View style={s.summaryItem}>
              <Text style={s.summaryNum}>{stockSummary.total}</Text>
              <Text style={s.summaryLabel}>Total</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: "#22c55e" }]}>{stockSummary.inStock}</Text>
              <Text style={s.summaryLabel}>In Stock</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: "#f59e0b" }]}>{stockSummary.low}</Text>
              <Text style={s.summaryLabel}>Low</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: "#ef4444" }]}>{stockSummary.out}</Text>
              <Text style={s.summaryLabel}>Out</Text>
            </View>
          </View>

          {/* Stock list with swipe */}
          <FlatList
            data={filteredStock}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <StockRow
                item={item}
                index={index}
                onEdit={setEditItem}
                onDelete={deleteStock}
              />
            )}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons name="layers-outline" size={40} color="#d1d5db" />
                <Text style={s.emptyStateText}>
                  {search || filter !== "all" ? "No items match your filter." : "No stock records yet."}
                </Text>
              </View>
            }
            ListFooterComponent={
              bagStock.length > 0 ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
                  <Text style={s.sectionLabel}>PAPER BAG STOCK</Text>
                  {bagStock.map((b) => {
                    const st = statusInfo(b.quantity, b.low_stock_threshold);
                    return (
                      <View key={b.id} style={[sw.row, { paddingHorizontal: 0 }]}>
                        <View style={[sw.avatar, { backgroundColor: "#6b7280" }]}>
                          <Ionicons name="bag-outline" size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={sw.name}>{b.label}</Text>
                          <Text style={sw.sku}>BAGS-{b.label?.toUpperCase().replace(/\s/g, "")}</Text>
                        </View>
                        <View style={[sw.qtyBadge, { backgroundColor: st.badge }]}>
                          <Text style={[sw.qtyText, { color: st.badgeText }]}>{b.quantity}</Text>
                          <Text style={[sw.qtyUnit, { color: st.badgeText }]}>pcs</Text>
                        </View>
                        <View style={sw.dotWrap}><View style={[sw.dot, { backgroundColor: st.dot }]} /></View>
                      </View>
                    );
                  })}
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          {/* Hint */}
          <View style={s.swipeHint}>
            <Ionicons name="arrow-back" size={12} color="#9ca3af" />
            <Text style={s.swipeHintText}>Swipe left to delete · right to edit</Text>
            <Ionicons name="arrow-forward" size={12} color="#9ca3af" />
          </View>
        </View>
      )}

      {/* ── Goods Received ── */}
      {tab === 4 && (
        <ScrollView contentContainerStyle={s.padded}>
          <View style={s.card}>
            <Text style={s.sectionLabel}>RECORD GOODS RECEIVED</Text>
            <Text style={s.label}>Supplier name</Text>
            <TextInput style={s.input} placeholder="e.g. Brookside Dairy" value={receipt.supplier_name}
              onChangeText={(v) => setReceipt({ ...receipt, supplier_name: v })} />
            <Text style={s.label}>Date received</Text>
            <TextInput style={s.input} placeholder="YYYY-MM-DD" value={receipt.date}
              onChangeText={(v) => setReceipt({ ...receipt, date: v })} />

            <Text style={[s.label, { marginTop: 12 }]}>Products received</Text>
            {receiptItems.map((item, idx) => (
              <View key={idx} style={s.lineCard}>
                <View style={s.lineHeader}>
                  <Text style={s.lineNum}>Line {idx + 1}</Text>
                  {receiptItems.length > 1 && (
                    <TouchableOpacity onPress={() => setReceiptItems((p) => p.filter((_, i) => i !== idx))}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={s.label}>Milk type</Text>
                <View style={s.chipRow}>
                  {milkTypes.map((mt) => (
                    <TouchableOpacity key={mt.id} onPress={() => updateRI(idx, "milk_type", mt.id)}
                      style={[s.chip, String(item.milk_type) === String(mt.id) && s.chipActive]}>
                      <Text style={[s.chipText, String(item.milk_type) === String(mt.id) && s.chipTextActive]}>{mt.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.label}>Pack size</Text>
                <View style={s.chipRow}>
                  {packSizes.map((ps) => (
                    <TouchableOpacity key={ps.id} onPress={() => updateRI(idx, "pack_size", ps.id)}
                      style={[s.chip, String(item.pack_size) === String(ps.id) && s.chipActive]}>
                      <Text style={[s.chipText, String(item.pack_size) === String(ps.id) && s.chipTextActive]}>{ps.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Qty received *</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" placeholder="0"
                      value={item.quantity} onChangeText={(v) => updateRI(idx, "quantity", v)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Unit cost (KES)</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" placeholder="Optional"
                      value={item.unit_cost} onChangeText={(v) => updateRI(idx, "unit_cost", v)} />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.addLineBtn} onPress={() => setReceiptItems((p) => [...p, { ...emptyReceiptItem }])}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={s.addLineBtnText}>Add another product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={submitReceipt} disabled={savingReceipt}>
              {savingReceipt ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Confirm Goods Received</Text>}
            </TouchableOpacity>
          </View>

          {receiptHistory.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={40} color="#d1d5db" />
              <Text style={s.emptyStateText}>No goods recorded yet this session</Text>
            </View>
          ) : (
            <>
              <Text style={s.sectionLabel}>RECEIVED THIS SESSION</Text>
              {receiptHistory.map((r) => (
                <View key={r.id} style={s.historyCard}>
                  <View style={s.historyHeader}>
                    <View>
                      <Text style={s.historySupplier}>{r.supplier}</Text>
                      <Text style={s.historyDate}>{r.date}</Text>
                    </View>
                    <View style={s.greenBadge}><Text style={s.greenBadgeText}>{r.items.length} item{r.items.length !== 1 ? "s" : ""}</Text></View>
                  </View>
                  {r.items.map((it, i) => (
                    <View key={i} style={s.historyLine}>
                      <Text style={s.historyLineText}>• {it.name}</Text>
                      <Text style={s.historyLineQty}>+{it.qty}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  refreshBtn: { padding: 6 },

  tabScroll: { flexGrow: 0 },
  tabBar: { paddingHorizontal: 12, gap: 6, paddingVertical: 6 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#e5e7eb" },
  tabChipActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  padded: { padding: 16, paddingBottom: 40 },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 8, marginBottom: 4, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  // Filter chips
  filterScroll: { flexGrow: 0, marginBottom: 2 },
  filterRow: { paddingHorizontal: 16, gap: 6, paddingVertical: 6 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  filterChipTextActive: { color: "#fff", fontWeight: "700" },
  filterDot: { width: 7, height: 7, borderRadius: 4 },

  // Category sub-chips
  catScroll: { flexGrow: 0 },
  catRow: { paddingHorizontal: 16, gap: 6, paddingVertical: 4 },
  catChip: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, backgroundColor: "#fff" },
  catChipText: { fontSize: 12, fontWeight: "600" },

  // Summary
  summaryBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 8, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 20, fontWeight: "800", color: "#111827" },
  summaryLabel: { fontSize: 10, color: "#9ca3af", marginTop: 1 },
  summaryDivider: { width: 1, height: 28, backgroundColor: "#f3f4f6" },

  // Swipe hint
  swipeHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  swipeHintText: { fontSize: 11, color: "#9ca3af" },

  // Simple rows for Milk Types / Pack Sizes
  simpleRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  miniAvatar: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  miniAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827", marginLeft: 10 },
  meta: { fontSize: 12, color: "#9ca3af" },

  addRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", color: "#111827" },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },
  priceText: { fontSize: 14, fontWeight: "700", color: colors.primary },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: "#6b7280" },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  empty: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24 },
  emptyState: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyStateText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },

  greenBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  greenBadgeText: { fontSize: 11, fontWeight: "700", color: "#166534" },

  lineCard: { backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, marginBottom: 10 },
  lineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  lineNum: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  twoCol: { flexDirection: "row", gap: 10 },
  addLineBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, borderStyle: "dashed", marginTop: 6 },
  addLineBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  historyCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  historySupplier: { fontSize: 14, fontWeight: "700", color: "#111827" },
  historyDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  historyLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  historyLineText: { fontSize: 13, color: "#374151" },
  historyLineQty: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
});
