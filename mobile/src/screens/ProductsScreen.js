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
import api from "../api/client";

const emptyForm = {
  name: "",
  category: "",
  cost_price: "",
  sell_price: "",
  wholesale_price: "",
  quantity: "",
  low_stock_threshold: "5",
};

export default function ProductsScreen() {
  const { accent } = useTheme();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get("/retail/products/"),
        api.get("/retail/categories/"),
      ]);
      setProducts(pRes.data.results ?? pRes.data);
      setCategories(cRes.data.results ?? cRes.data);
    } catch {
      Alert.alert("Error", "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditProduct(item);
    setForm({
      name: item.name,
      category: item.category ? String(item.category) : "",
      cost_price: String(item.cost_price),
      sell_price: String(item.sell_price),
      wholesale_price: String(item.wholesale_price),
      quantity: String(item.quantity),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert("Validation", "Product name required."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        cost_price: parseFloat(form.cost_price) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
        wholesale_price: parseFloat(form.wholesale_price) || 0,
        quantity: parseFloat(form.quantity) || 0,
        low_stock_threshold: parseFloat(form.low_stock_threshold) || 5,
      };
      if (editProduct) {
        await api.patch(`/retail/products/${editProduct.id}/`, payload);
      } else {
        await api.post("/retail/products/", payload);
      }
      setModalVisible(false);
      load();
    } catch {
      Alert.alert("Error", "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Product", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/retail/products/${item.id}/`);
            load();
          } catch { Alert.alert("Error", "Could not delete."); }
        },
      },
    ]);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await api.post("/retail/categories/", { name: newCatName.trim() });
      setCategories((c) => [...c, res.data]);
      setForm((f) => ({ ...f, category: String(res.data.id) }));
      setNewCatName("");
      setCatModal(false);
    } catch { Alert.alert("Error", "Could not add category."); }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const stockBadge = (item) => {
    if (parseFloat(item.quantity) === 0) return { label: "Out of stock", color: "#ef4444" };
    if (item.is_low) return { label: "Low stock", color: "#f59e0b" };
    return { label: "In stock", color: "#22c55e" };
  };

  const selectedCatName = () => {
    if (!form.category) return "None";
    const c = categories.find((c) => String(c.id) === String(form.category));
    return c ? c.name : "None";
  };

  const s = styles(accent);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Products</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const badge = stockBadge(item);
            return (
              <View style={s.card}>
                <View style={s.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{item.name}</Text>
                    {item.category_name ? (
                      <Text style={s.cardSub}>{item.category_name}</Text>
                    ) : null}
                  </View>
                  <View style={[s.badge, { backgroundColor: badge.color + "22" }]}>
                    <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                <View style={s.priceRow}>
                  <View style={s.priceCell}>
                    <Text style={s.priceLabel}>Cost</Text>
                    <Text style={s.priceValue}>KES {parseFloat(item.cost_price).toFixed(2)}</Text>
                  </View>
                  <View style={s.priceCell}>
                    <Text style={s.priceLabel}>Sell</Text>
                    <Text style={s.priceValue}>KES {parseFloat(item.sell_price).toFixed(2)}</Text>
                  </View>
                  <View style={s.priceCell}>
                    <Text style={s.priceLabel}>Wholesale</Text>
                    <Text style={s.priceValue}>KES {parseFloat(item.wholesale_price).toFixed(2)}</Text>
                  </View>
                  <View style={s.priceCell}>
                    <Text style={s.priceLabel}>Qty</Text>
                    <Text style={s.priceValue}>{parseFloat(item.quantity)}</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}>
                    <Ionicons name="create-outline" size={16} color={accent} />
                    <Text style={[s.actionText, { color: accent }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={[s.actionText, { color: "#ef4444" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={48} color="#9ca3af" />
              <Text style={s.emptyText}>No products yet</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editProduct ? "Edit Product" : "Add Product"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Product Name *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Bread" />

              <Text style={s.label}>Category</Text>
              <View style={s.catRow}>
                <TouchableOpacity style={[s.catSelect, { flex: 1 }]} onPress={() => setCatModal(true)}>
                  <Text style={{ color: form.category ? "#111827" : "#9ca3af" }}>{selectedCatName()}</Text>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Cost Price (KES)</Text>
              <TextInput style={s.input} value={form.cost_price} onChangeText={(v) => setForm((f) => ({ ...f, cost_price: v }))} keyboardType="decimal-pad" placeholder="0.00" />

              <Text style={s.label}>Selling Price (KES)</Text>
              <TextInput style={s.input} value={form.sell_price} onChangeText={(v) => setForm((f) => ({ ...f, sell_price: v }))} keyboardType="decimal-pad" placeholder="0.00" />

              <Text style={s.label}>Wholesale Price (KES)</Text>
              <TextInput style={s.input} value={form.wholesale_price} onChangeText={(v) => setForm((f) => ({ ...f, wholesale_price: v }))} keyboardType="decimal-pad" placeholder="0.00" />

              <Text style={s.label}>Quantity in Stock</Text>
              <TextInput style={s.input} value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} keyboardType="decimal-pad" placeholder="0" />

              <Text style={s.label}>Low Stock Alert Below</Text>
              <TextInput style={s.input} value={form.low_stock_threshold} onChangeText={(v) => setForm((f) => ({ ...f, low_stock_threshold: v }))} keyboardType="decimal-pad" placeholder="5" />

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: accent }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editProduct ? "Save Changes" : "Add Product"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={catModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "60%" }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCatModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={s.newCatRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="New category name"
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <TouchableOpacity style={[s.catAddBtn, { marginLeft: 8 }]} onPress={addCategory}>
                <Ionicons name="add" size={18} color={accent} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={s.catItem}
              onPress={() => { setForm((f) => ({ ...f, category: "" })); setCatModal(false); }}
            >
              <Text style={{ color: "#6b7280" }}>None</Text>
              {!form.category && <Ionicons name="checkmark" size={18} color={accent} />}
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={s.catItem}
                onPress={() => { setForm((f) => ({ ...f, category: String(c.id) })); setCatModal(false); }}
              >
                <Text>{c.name}</Text>
                {String(form.category) === String(c.id) && <Ionicons name="checkmark" size={18} color={accent} />}
              </TouchableOpacity>
            ))}
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
    searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 4 },
    searchInput: { flex: 1, fontSize: 14, color: "#111827" },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
    cardRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
    cardName: { fontSize: 15, fontWeight: "700", color: "#111827" },
    cardSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: "600" },
    priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    priceCell: { alignItems: "center" },
    priceLabel: { fontSize: 10, color: "#9ca3af", marginBottom: 2 },
    priceValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
    cardActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, gap: 16 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionText: { fontSize: 13, fontWeight: "600" },
    empty: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: "#9ca3af", marginTop: 8, fontSize: 15 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    label: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 4, marginTop: 12 },
    input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb", marginBottom: 2 },
    catRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    catSelect: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f9fafb" },
    catAddBtn: { borderWidth: 1, borderColor: accent, borderRadius: 8, padding: 10 },
    saveBtn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    newCatRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    catItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  });
