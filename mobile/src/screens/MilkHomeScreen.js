import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, TouchableWithoutFeedback, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api/client";

const GROUPS = [
  {
    label: "Sales",
    items: [
      { name: "Point of Sell", icon: "cart-outline", screen: "POS_TAB" },
      { name: "Sell Report", icon: "document-text-outline", screen: "SalesReport" },
    ],
  },
  {
    label: "Stock",
    items: [
      { name: "Inventory", icon: "layers-outline", screen: "Inventory" },
      { name: "Expenses", icon: "receipt-outline", screen: "Expenses" },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Customer", icon: "people-outline", screen: "Customers" },
      { name: "Supplier", icon: "cube-outline", screen: "SUPPLIER_MODAL" },
      { name: "Employee", icon: "person-add-outline", screen: "Employees", ownerOnly: true },
    ],
  },
];

const EMPTY_SUP = { first_name: "", last_name: "", phone: "", goods: "" };

export default function MilkHomeScreen() {
  const navigation = useNavigation();
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [supModal, setSupModal] = useState(false);
  const [supForm, setSupForm] = useState(EMPTY_SUP);
  const [saving, setSaving] = useState(false);

  const openSupplier = () => { setSupForm(EMPTY_SUP); setSupModal(true); };

  const saveSupplier = async () => {
    if (!supForm.first_name.trim()) { Alert.alert("Required", "First name is required."); return; }
    setSaving(true);
    try {
      const name = `${supForm.first_name.trim()} ${supForm.last_name.trim()}`.trim();
      await api.post("/inventory/suppliers/", {
        name,
        phone: supForm.phone.trim(),
        note: supForm.goods.trim(),
      });
      setSupModal(false);
      Alert.alert("Saved", `${name} added as supplier.`);
    } catch {
      Alert.alert("Error", "Could not save supplier. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTile = (screen) => {
    if (screen === "POS_TAB") {
      navigation.getParent()?.navigate("POS");
    } else if (screen === "SUPPLIER_MODAL") {
      openSupplier();
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.welcome}>Welcome back,</Text>
        <Text style={[s.shopName, { color: colors.primary }]}>{user?.shop_name || user?.username}</Text>
      </View>

      {GROUPS.map((group) => {
        const visibleItems = group.items.filter((it) => !it.ownerOnly || isOwner);
        if (!visibleItems.length) return null;
        return (
          <View key={group.label} style={s.group}>
            <Text style={s.groupLabel}>{group.label.toUpperCase()}</Text>
            <View style={s.tileGrid}>
              {visibleItems.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[s.tile, item.screen === "POS_TAB" && { backgroundColor: colors.primary }]}
                  onPress={() => handleTile(item.screen)}
                >
                  <Ionicons
                    name={item.icon}
                    size={28}
                    color={item.screen === "POS_TAB" ? "#fff" : colors.primary}
                  />
                  <Text style={[s.tileTxt, item.screen === "POS_TAB" && { color: "#fff" }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
      {/* Supplier Registration Modal */}
      <Modal visible={supModal} transparent animationType="slide" onRequestClose={() => setSupModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={() => setSupModal(false)}>
            <View style={s.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Register Supplier</Text>
              <TouchableOpacity onPress={() => setSupModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>First Name *</Text>
                <TextInput style={s.input} placeholder="e.g. John"
                  value={supForm.first_name}
                  onChangeText={(v) => setSupForm((f) => ({ ...f, first_name: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Last Name</Text>
                <TextInput style={s.input} placeholder="e.g. Kamau"
                  value={supForm.last_name}
                  onChangeText={(v) => setSupForm((f) => ({ ...f, last_name: v }))} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Phone Number</Text>
            <TextInput style={s.input} placeholder="e.g. 2547XXXXXXXX" keyboardType="phone-pad"
              value={supForm.phone}
              onChangeText={(v) => setSupForm((f) => ({ ...f, phone: v }))} />

            <Text style={s.fieldLabel}>Goods / Products Supplied</Text>
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="e.g. Fresh milk, Yoghurt, Cream"
              multiline
              value={supForm.goods}
              onChangeText={(v) => setSupForm((f) => ({ ...f, goods: v }))}
            />

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={saveSupplier}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnTxt}>Save Supplier</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  welcome: { fontSize: 13, color: "#9ca3af" },
  shopName: { fontSize: 22, fontWeight: "800" },
  group: { marginBottom: 20 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 10, letterSpacing: 1 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tileTxt: { fontSize: 13, fontWeight: "700", color: "#374151", textAlign: "center" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#d1d5db", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldLabel: { fontSize: 11, color: "#6b7280", marginBottom: 3, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 11, paddingVertical: 9, fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  saveBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 6 },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
