import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

const emptyForm = { name: "", cost_price: "", sell_price: "", stock_quantity: "" };

export default function MilkProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const openEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      cost_price: String(product.cost_price),
      sell_price: String(product.sell_price),
      stock_quantity: String(product.stock_quantity),
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
  };

  const validate = () => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.sell_price || isNaN(parseFloat(form.sell_price))) return "Sell price is required.";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
        sell_price: parseFloat(form.sell_price),
        stock_quantity: form.stock_quantity ? parseFloat(form.stock_quantity) : 0,
      };
      if (editId) {
        await api.patch(`/inventory/products/${editId}/`, payload);
      } else {
        await api.post("/inventory/products/", payload);
      }
      cancelEdit();
      load();
    } catch (e) {
      const data = e.response?.data;
      const msg = data && typeof data === "object"
        ? Object.values(data).flat().join(" ")
        : "Could not save product.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

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

  const margin = (p) => {
    if (!p.cost_price || parseFloat(p.cost_price) === 0) return null;
    const m = ((parseFloat(p.sell_price) - parseFloat(p.cost_price)) / parseFloat(p.cost_price)) * 100;
    return m.toFixed(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>

      {/* Add / Edit form */}
      <ScrollView style={{ flexGrow: 0 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editId ? "Edit Product" : "Add Product"}</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.label}>Product name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bread, Sugar, Pen"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cost price (KES)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={form.cost_price}
                onChangeText={(v) => setForm({ ...form, cost_price: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sell price (KES) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={form.sell_price}
                onChangeText={(v) => setForm({ ...form, sell_price: v })}
              />
            </View>
          </View>

          <Text style={styles.label}>Opening stock qty</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0"
            value={form.stock_quantity}
            onChangeText={(v) => setForm({ ...form, stock_quantity: v })}
          />

          {form.cost_price && form.sell_price && parseFloat(form.cost_price) > 0 && (
            <View style={styles.marginPreview}>
              <Text style={styles.marginText}>
                Profit: KES {(parseFloat(form.sell_price || 0) - parseFloat(form.cost_price || 0)).toFixed(2)} ·{" "}
                {(((parseFloat(form.sell_price) - parseFloat(form.cost_price)) / parseFloat(form.cost_price)) * 100).toFixed(0)}% margin
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            {editId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>{editId ? "Update" : "Add Product"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Product list */}
      <Text style={styles.sectionLabel}>YOUR PRODUCTS ({products.length})</Text>

      {loading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        : (
          <FlatList
            data={products}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.empty}>No products yet. Add one above.</Text>
            }
            renderItem={({ item: p }) => (
              <View style={[styles.productCard, !p.is_active && styles.productCardInactive]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{p.name}</Text>
                    {!p.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceRow}>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>Cost</Text>
                      <Text style={styles.priceValue}>KES {parseFloat(p.cost_price).toFixed(2)}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>Sell</Text>
                      <Text style={[styles.priceValue, { color: colors.primary }]}>
                        KES {parseFloat(p.sell_price).toFixed(2)}
                      </Text>
                    </View>
                    {margin(p) && (
                      <View style={styles.marginBadge}>
                        <Text style={styles.marginBadgeText}>{margin(p)}% margin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stockText}>Stock: {parseFloat(p.stock_quantity)} units</Text>
                </View>
                <View style={styles.actionCol}>
                  <TouchableOpacity onPress={() => openEdit(p)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleActive(p)} style={styles.iconBtn}>
                    <Ionicons
                      name={p.is_active ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  errorText: { color: "#dc2626", fontSize: 12, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 9, backgroundColor: "#f9fafb", color: colors.text, marginBottom: 4 },
  twoCol: { flexDirection: "row", gap: 10 },
  marginPreview: { backgroundColor: "#f0fdf4", borderRadius: 6, padding: 8, marginTop: 8 },
  marginText: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, paddingHorizontal: 16, alignItems: "center" },
  cancelBtnText: { color: colors.textSecondary, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 24 },
  productCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  productCardInactive: { opacity: 0.6 },
  productHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text },
  inactiveBadge: { backgroundColor: "#f3f4f6", borderRadius: 8, paddingVertical: 1, paddingHorizontal: 6 },
  inactiveBadgeText: { fontSize: 10, color: "#6b7280" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  priceBox: {},
  priceLabel: { fontSize: 10, color: colors.textSecondary },
  priceValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  marginBadge: { backgroundColor: "#dcfce7", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  marginBadgeText: { fontSize: 10, fontWeight: "600", color: "#16a34a" },
  stockText: { fontSize: 11, color: colors.textSecondary },
  actionCol: { gap: 8 },
  iconBtn: { padding: 4 },
});
