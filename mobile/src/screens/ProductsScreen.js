import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const emptyForm = { name: "", price: "", quantity: "" };

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/inventory/products/");
      setProducts(r.data.results || r.data);
    } catch {
      Alert.alert("Error", "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addProduct = async () => {
    if (!form.name.trim() || !form.price) {
      Alert.alert("Missing fields", "Product name and price are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/inventory/products/", {
        name: form.name.trim(),
        price: form.price,
        quantity: form.quantity || 0,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      const data = err.response?.data;
      const msg = data && typeof data === "object"
        ? Object.values(data).flat().join(" ")
        : "Could not add product.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const visible = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const stockBadge = (qty) => {
    if (qty <= 0) return { label: "Out of stock", bg: "#fee2e2", text: "#b91c1c" };
    if (qty <= 5) return { label: "Low stock", bg: "#fef3c7", text: "#92400e" };
    return { label: "In stock", bg: "#dcfce7", text: "#166534" };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.countLabel}>{products.length} items</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add product</Text>
        <Text style={styles.label}>Product name</Text>
        <TextInput style={styles.input} placeholder="e.g. Maize flour 2kg" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price (KES)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 180" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Qty in stock</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 50" value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} />
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={addProduct} disabled={saving}>
          <Text style={styles.addBtnText}>{saving ? "Adding…" : "Add product"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>No products yet.</Text>}
          renderItem={({ item: p }) => {
            const badge = stockBadge(p.quantity ?? 0);
            return (
              <View style={styles.productCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productQty}>Qty: {p.quantity ?? 0} in stock</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.priceText}>KES {p.price}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  countLabel: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, paddingHorizontal: 10, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 8, color: colors.text },
  formCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  formTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 6, marginBottom: 3 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: "#fff", color: colors.text },
  twoCol: { flexDirection: "row", gap: 10 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  productCard: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  productName: { fontSize: 13, fontWeight: "600", color: colors.text },
  productQty: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  priceText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  badge: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 24 },
});
