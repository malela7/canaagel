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

const emptyForm = { supplier_name: "", notes: "" };
const emptyItem = { product_id: "", quantity: "", unit_cost: "" };

export default function StockOrdersScreen() {
  const { accent } = useTheme();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [productPicker, setProductPicker] = useState(null); // index of item being edited

  const load = async () => {
    try {
      const [oRes, pRes] = await Promise.all([
        api.get("/retail/orders/"),
        api.get("/retail/products/?active=1"),
      ]);
      setOrders(oRes.data.results ?? oRes.data);
      setProducts(pRes.data.results ?? pRes.data);
    } catch {
      Alert.alert("Error", "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, key, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const handleSave = async () => {
    for (const it of items) {
      if (!it.product_id) { Alert.alert("Validation", "Select a product for each item."); return; }
      if (!it.quantity || isNaN(parseFloat(it.quantity))) { Alert.alert("Validation", "Enter quantity for each item."); return; }
      if (!it.unit_cost || isNaN(parseFloat(it.unit_cost))) { Alert.alert("Validation", "Enter unit cost for each item."); return; }
    }
    setSaving(true);
    try {
      await api.post("/retail/orders/", {
        supplier_name: form.supplier_name.trim(),
        notes: form.notes.trim(),
        items: items.map((it) => ({
          product: parseInt(it.product_id),
          quantity: parseFloat(it.quantity),
          unit_cost: parseFloat(it.unit_cost),
        })),
      });
      setModalVisible(false);
      setForm(emptyForm);
      setItems([{ ...emptyItem }]);
      load();
    } catch {
      Alert.alert("Error", "Could not create order.");
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = (order) => {
    Alert.alert("Receive Order", "Mark as received? Stock quantities will be updated.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Receive", style: "default",
        onPress: async () => {
          try { await api.post(`/retail/orders/${order.id}/receive/`); load(); }
          catch { Alert.alert("Error", "Could not receive order."); }
        },
      },
    ]);
  };

  const handleCancel = (order) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: async () => {
          try { await api.post(`/retail/orders/${order.id}/cancel/`); load(); }
          catch { Alert.alert("Error", "Could not cancel order."); }
        },
      },
    ]);
  };

  const statusColor = (s) => ({ PENDING: "#f59e0b", RECEIVED: "#22c55e", CANCELLED: "#ef4444" }[s] || "#6b7280");

  const productName = (id) => products.find((p) => String(p.id) === String(id))?.name || "Select product";

  const s = styles(accent);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Stock Orders</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(emptyForm); setItems([{ ...emptyItem }]); setModalVisible(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>New Order</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} size="large" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.cardTitle}>Order #{item.id}</Text>
                  {item.supplier_name ? <Text style={s.cardSub}>{item.supplier_name}</Text> : null}
                  <Text style={s.cardDate}>{new Date(item.ordered_at).toLocaleDateString()}</Text>
                </View>
                <View>
                  <View style={[s.badge, { backgroundColor: statusColor(item.status) + "22" }]}>
                    <Text style={[s.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
                  </View>
                  <Text style={s.cost}>KES {parseFloat(item.total_cost).toFixed(2)}</Text>
                </View>
              </View>
              {item.items && item.items.length > 0 && (
                <View style={s.itemsList}>
                  {item.items.map((it) => (
                    <Text key={it.id} style={s.itemLine}>
                      • {it.product_name} × {it.quantity} @ KES {it.unit_cost}
                    </Text>
                  ))}
                </View>
              )}
              {item.status === "PENDING" && (
                <View style={s.actions}>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: "#22c55e" }]} onPress={() => handleReceive(item)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                    <Text style={[s.actionText, { color: "#22c55e" }]}>Receive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: "#ef4444" }]} onPress={() => handleCancel(item)}>
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={[s.actionText, { color: "#ef4444" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="file-tray-outline" size={48} color="#9ca3af" />
              <Text style={s.emptyText}>No stock orders yet</Text>
            </View>
          }
        />
      )}

      {/* New Order Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>New Stock Order</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Supplier Name</Text>
              <TextInput style={s.input} value={form.supplier_name} onChangeText={(v) => setForm((f) => ({ ...f, supplier_name: v }))} placeholder="Optional" />

              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 70 }]} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Optional notes" multiline />

              <Text style={[s.label, { marginTop: 16 }]}>Order Items</Text>
              {items.map((it, idx) => (
                <View key={idx} style={s.itemRow}>
                  <TouchableOpacity
                    style={[s.input, s.productSelect]}
                    onPress={() => setProductPicker(idx)}
                  >
                    <Text style={{ color: it.product_id ? "#111827" : "#9ca3af", flex: 1 }}>{productName(it.product_id)}</Text>
                    <Ionicons name="chevron-down" size={14} color="#6b7280" />
                  </TouchableOpacity>
                  <View style={s.itemQtyRow}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder="Qty"
                      keyboardType="decimal-pad"
                      value={it.quantity}
                      onChangeText={(v) => updateItem(idx, "quantity", v)}
                    />
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder="Unit Cost"
                      keyboardType="decimal-pad"
                      value={it.unit_cost}
                      onChangeText={(v) => updateItem(idx, "unit_cost", v)}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
                <Ionicons name="add-circle-outline" size={16} color={accent} />
                <Text style={[s.addItemText, { color: accent }]}>Add Item</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: accent }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Place Order</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product picker modal */}
      <Modal visible={productPicker !== null} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "60%" }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setProductPicker(null)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.catItem}
                onPress={() => { updateItem(productPicker, "product_id", String(p.id)); setProductPicker(null); }}
              >
                <Text>{p.name}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>KES {p.sell_price}</Text>
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
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
    cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
    cardSub: { fontSize: 13, color: "#6b7280" },
    cardDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
    badgeText: { fontSize: 11, fontWeight: "600" },
    cost: { fontSize: 14, fontWeight: "700", color: "#111827", textAlign: "right", marginTop: 4 },
    itemsList: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8, marginBottom: 8 },
    itemLine: { fontSize: 13, color: "#374151", marginBottom: 3 },
    actions: { flexDirection: "row", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 8, paddingVertical: 8, gap: 4 },
    actionText: { fontSize: 13, fontWeight: "600" },
    empty: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: "#9ca3af", marginTop: 8, fontSize: 15 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "92%" },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    label: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 4, marginTop: 12 },
    input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb", marginBottom: 6 },
    productSelect: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    itemRow: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: "#f9fafb" },
    itemQtyRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    addItemBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
    addItemText: { fontSize: 14, fontWeight: "600" },
    saveBtn: { marginTop: 16, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    catItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  });
