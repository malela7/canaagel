import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const emptyRow = () => ({ name: "", cost_price: "", sell_price: "", stock_quantity: "" });

function margin(cost, sell) {
  const c = parseFloat(cost), s = parseFloat(sell);
  if (!c || !s || c === 0) return null;
  return (((s - c) / c) * 100).toFixed(0);
}

// ── Shared table header ────────────────────────────────────
function TableHeader() {
  return (
    <View style={st.tableHeader}>
      <Text style={[st.th, { flex: 2 }]}>Product Name</Text>
      <Text style={[st.th, { flex: 1 }]}>Cost</Text>
      <Text style={[st.th, { flex: 1 }]}>Sell</Text>
      <Text style={[st.th, { flex: 1 }]}>Qty</Text>
      <Text style={[st.th, { width: 56 }]}></Text>
    </View>
  );
}

// ── Editable new-product rows (bulk add) ───────────────────
function BulkAddTable({ onSaved }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setErrors((prev) => { const e = { ...prev }; delete e[idx]; return e; });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx) => {
    if (rows.length === 1) { setRows([emptyRow()]); return; }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    const filled = rows.filter((r) => r.name.trim());
    if (!filled.length) { Alert.alert("Nothing to save", "Enter at least one product name."); return; }

    const errs = {};
    filled.forEach((r, i) => {
      if (!r.sell_price || isNaN(parseFloat(r.sell_price))) errs[i] = "Sell price required";
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await Promise.all(
        filled.map((r) =>
          api.post("/inventory/products/", {
            name: r.name.trim(),
            cost_price: r.cost_price ? parseFloat(r.cost_price) : 0,
            sell_price: parseFloat(r.sell_price),
            stock_quantity: r.stock_quantity ? parseFloat(r.stock_quantity) : 0,
          })
        )
      );
      setRows([emptyRow()]);
      setErrors({});
      onSaved();
    } catch (e) {
      Alert.alert("Error", "Some products could not be saved. Check your inputs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.card}>
      <View style={st.cardTitleRow}>
        <Text style={st.cardTitle}>ADD PRODUCTS</Text>
        <TouchableOpacity style={st.addRowBtn} onPress={addRow}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={st.addRowText}>Add row</Text>
        </TouchableOpacity>
      </View>

      <TableHeader />

      {rows.map((row, idx) => (
        <View key={idx}>
          <View style={st.inputRow}>
            <TextInput
              style={[st.cell, { flex: 2 }, errors[idx] && st.cellError]}
              placeholder="Name"
              placeholderTextColor="#9ca3af"
              value={row.name}
              onChangeText={(v) => update(idx, "name", v)}
            />
            <TextInput
              style={[st.cell, { flex: 1 }]}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={row.cost_price}
              onChangeText={(v) => update(idx, "cost_price", v)}
            />
            <TextInput
              style={[st.cell, { flex: 1 }, errors[idx] && st.cellError]}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={row.sell_price}
              onChangeText={(v) => update(idx, "sell_price", v)}
            />
            <TextInput
              style={[st.cell, { flex: 1 }]}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={row.stock_quantity}
              onChangeText={(v) => update(idx, "stock_quantity", v)}
            />
            <TouchableOpacity style={[st.cell, { width: 56, alignItems: "center" }]} onPress={() => removeRow(idx)}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          {/* Live margin preview */}
          {row.cost_price && row.sell_price && parseFloat(row.cost_price) > 0 && (
            <Text style={st.marginHint}>
              Margin: {margin(row.cost_price, row.sell_price)}% · Profit KES {(parseFloat(row.sell_price || 0) - parseFloat(row.cost_price || 0)).toFixed(2)}
            </Text>
          )}
          {errors[idx] && <Text style={st.rowError}>{errors[idx]}</Text>}
        </View>
      ))}

      <TouchableOpacity style={st.saveAllBtn} onPress={saveAll} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={st.saveAllText}>Save {rows.filter((r) => r.name.trim()).length || ""} Product{rows.filter((r) => r.name.trim()).length !== 1 ? "s" : ""}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Existing products table ────────────────────────────────
function ProductTable({ products, onEdit, onToggle }) {
  return (
    <View style={st.card}>
      <Text style={st.cardTitle}>YOUR PRODUCTS ({products.length})</Text>
      {products.length === 0 ? (
        <Text style={st.empty}>No products yet.</Text>
      ) : (
        <>
          <View style={st.tableHeader}>
            <Text style={[st.th, { flex: 2 }]}>Name</Text>
            <Text style={[st.th, { flex: 1 }]}>Cost</Text>
            <Text style={[st.th, { flex: 1 }]}>Sell</Text>
            <Text style={[st.th, { flex: 0.8 }]}>Qty</Text>
            <Text style={[st.th, { flex: 0.8 }]}>Margin</Text>
            <Text style={[st.th, { width: 60 }]}></Text>
          </View>
          {products.map((p, idx) => {
            const m = margin(p.cost_price, p.sell_price);
            return (
              <View key={p.id} style={[st.tableRow, idx % 2 === 0 && st.tableRowAlt, !p.is_active && st.tableRowInactive]}>
                <View style={{ flex: 2 }}>
                  <Text style={st.tdName} numberOfLines={1}>{p.name}</Text>
                  {!p.is_active && <Text style={st.inactiveLabel}>inactive</Text>}
                </View>
                <Text style={[st.td, { flex: 1 }]}>{parseFloat(p.cost_price).toFixed(0)}</Text>
                <Text style={[st.td, { flex: 1, color: colors.primary, fontWeight: "700" }]}>{parseFloat(p.sell_price).toFixed(0)}</Text>
                <Text style={[st.td, { flex: 0.8 }]}>{parseFloat(p.stock_quantity).toFixed(0)}</Text>
                <View style={{ flex: 0.8, alignItems: "center" }}>
                  {m ? (
                    <View style={[st.marginChip, parseFloat(m) < 0 && { backgroundColor: "#fee2e2" }]}>
                      <Text style={[st.marginChipText, parseFloat(m) < 0 && { color: "#dc2626" }]}>{m}%</Text>
                    </View>
                  ) : <Text style={st.td}>—</Text>}
                </View>
                <View style={{ width: 60, flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
                  <TouchableOpacity onPress={() => onEdit(p)} style={st.iconBtn}>
                    <Ionicons name="create-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onToggle(p)} style={st.iconBtn}>
                    <Ionicons name={p.is_active ? "eye-off-outline" : "eye-outline"} size={17} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

// ── Edit modal (inline bottom card) ───────────────────────
function EditCard({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product.name,
    cost_price: String(product.cost_price),
    sell_price: String(product.sell_price),
    stock_quantity: String(product.stock_quantity),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.sell_price || isNaN(parseFloat(form.sell_price))) { setError("Sell price is required."); return; }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/inventory/products/${product.id}/`, {
        name: form.name.trim(),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
        sell_price: parseFloat(form.sell_price),
        stock_quantity: form.stock_quantity ? parseFloat(form.stock_quantity) : 0,
      });
      onSave();
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const m = margin(form.cost_price, form.sell_price);

  return (
    <View style={[st.card, { borderColor: colors.primary, borderWidth: 1.5 }]}>
      <View style={st.cardTitleRow}>
        <Text style={[st.cardTitle, { color: colors.primary }]}>EDITING: {product.name.toUpperCase()}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={st.rowError}>{error}</Text>}
      <TableHeader />
      <View style={st.inputRow}>
        <TextInput style={[st.cell, { flex: 2 }]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Name" placeholderTextColor="#9ca3af" />
        <TextInput style={[st.cell, { flex: 1 }]} value={form.cost_price} onChangeText={(v) => setForm({ ...form, cost_price: v })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9ca3af" />
        <TextInput style={[st.cell, { flex: 1 }]} value={form.sell_price} onChangeText={(v) => setForm({ ...form, sell_price: v })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9ca3af" />
        <TextInput style={[st.cell, { flex: 1 }]} value={form.stock_quantity} onChangeText={(v) => setForm({ ...form, stock_quantity: v })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9ca3af" />
        <View style={{ width: 56 }} />
      </View>
      {m && (
        <Text style={st.marginHint}>Margin: {m}% · Profit KES {(parseFloat(form.sell_price || 0) - parseFloat(form.cost_price || 0)).toFixed(2)}</Text>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TouchableOpacity style={st.cancelBtn} onPress={onCancel}>
          <Text style={st.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.saveAllBtn, { flex: 1, marginTop: 0 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.saveAllText}>Update</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────
export default function MilkProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/inventory/products/");
      setProducts(data.results || data);
    } catch {
      Alert.alert("Error", "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = (product) => {
    Alert.alert(
      product.is_active ? "Deactivate?" : "Activate?",
      `${product.is_active ? "Hide" : "Show"} "${product.name}" in the POS?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: product.is_active ? "Deactivate" : "Activate",
          onPress: async () => {
            await api.patch(`/inventory/products/${product.id}/`, { is_active: !product.is_active });
            load();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={st.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={st.title}>Products</Text>

      <BulkAddTable onSaved={load} />

      {editProduct && (
        <EditCard
          product={editProduct}
          onSave={() => { setEditProduct(null); load(); }}
          onCancel={() => setEditProduct(null)}
        />
      )}

      {loading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        : (
          <ProductTable
            products={products}
            onEdit={setEditProduct}
            onToggle={toggleActive}
          />
        )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },

  addRowBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  addRowText: { fontSize: 12, color: colors.primary, fontWeight: "700" },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#e5e7eb", paddingBottom: 6, marginBottom: 4 },
  th: { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  cell: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 7, fontSize: 13, color: colors.text, backgroundColor: "#f9fafb" },
  cellError: { borderColor: "#ef4444" },

  marginHint: { fontSize: 11, color: "#16a34a", fontWeight: "600", marginBottom: 4, paddingLeft: 4 },
  rowError: { fontSize: 11, color: "#dc2626", marginBottom: 4, paddingLeft: 4 },

  saveAllBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center", marginTop: 10 },
  saveAllText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelBtn: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, paddingHorizontal: 20, alignItems: "center" },
  cancelBtnText: { color: colors.textSecondary, fontWeight: "600" },

  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  tableRowInactive: { opacity: 0.5 },
  td: { fontSize: 13, color: colors.text },
  tdName: { fontSize: 13, fontWeight: "700", color: colors.text },
  inactiveLabel: { fontSize: 9, color: "#9ca3af", textTransform: "uppercase" },

  marginChip: { backgroundColor: "#dcfce7", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 5 },
  marginChipText: { fontSize: 10, fontWeight: "700", color: "#16a34a" },

  iconBtn: { padding: 3 },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 16 },
});
