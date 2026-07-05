import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48) / 2; // 2 columns, 12px side padding + 12px gap

const PAYMENT_METHODS = [
  { key: "CASH",    label: "Cash",        icon: "cash-outline",           color: "#16a34a" },
  { key: "MPESA",   label: "M-Pesa",      icon: "phone-portrait-outline", color: "#22c55e" },
  { key: "PAYBILL", label: "PayBill",     icon: "business-outline",       color: "#0ea5e9" },
  { key: "CREDIT",  label: "Credit/Debt", icon: "time-outline",           color: "#f59e0b" },
];

function emptyItem() { return { milk_type: "", pack_size: "", quantity: "1" }; }

export default function POSScreen() {
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const [milkTypes, setMilkTypes]   = useState([]);
  const [packSizes, setPackSizes]   = useState([]);
  const [prices, setPrices]         = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [isWalkIn, setIsWalkIn]     = useState(true);
  const [items, setItems]           = useState([emptyItem()]);
  const [paperBags, setPaperBags]   = useState("0");
  const [payMethod, setPayMethod]   = useState("CASH");
  const [message, setMessage]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [custModal, setCustModal]   = useState(false);
  const [custSearch, setCustSearch] = useState("");

  useEffect(() => {
    api.get("/inventory/milk-types/").then((r) => setMilkTypes(r.data.results || r.data));
    api.get("/inventory/pack-sizes/").then((r) => setPackSizes(r.data.results || r.data));
    api.get("/inventory/prices/").then((r) => setPrices(r.data.results || r.data));
    api.get("/sales/customers/?page_size=200").then((r) => setCustomers(r.data.results || r.data));
  }, []);

  // Each price entry is one selectable combo
  const combos = prices.map((p) => ({
    key: `${p.milk_type}-${p.pack_size}`,
    milk_type: String(p.milk_type),
    pack_size: String(p.pack_size),
    milk_type_name: p.milk_type_name || milkTypes.find((m) => String(m.id) === String(p.milk_type))?.name || "—",
    pack_size_label: p.pack_size_label || packSizes.find((ps) => String(ps.id) === String(p.pack_size))?.label || "—",
    amount: parseFloat(p.amount) || 0,
  }));

  const getUnitPrice = (mtId, psId) => {
    const p = prices.find((x) => String(x.milk_type) === String(mtId) && String(x.pack_size) === String(psId));
    return p ? parseFloat(p.amount) : 0;
  };

  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const lineTotal = (it) => getUnitPrice(it.milk_type, it.pack_size) * (parseFloat(it.quantity) || 0);
  const orderTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  const handleSubmit = async () => {
    const validItems = items.filter((it) => it.milk_type && it.pack_size && parseFloat(it.quantity) > 0);
    if (!validItems.length) { Alert.alert("Error", "Select at least one product."); return; }
    setSubmitting(true); setMessage(null);
    try {
      const payload = {
        customer: isWalkIn ? null : (customerId || null),
        is_walk_in: isWalkIn,
        paper_bags_used: Number(paperBags) || 0,
        items: validItems.map((it) => ({
          milk_type: Number(it.milk_type),
          pack_size: Number(it.pack_size),
          quantity: it.quantity,
        })),
      };
      const { data: order } = await api.post("/sales/orders/", payload);

      if (!isWalkIn && customerId && payMethod !== "CREDIT") {
        await api.post("/sales/payments/", {
          customer: Number(customerId),
          amount: order.total_amount,
          method: payMethod === "PAYBILL" ? "BANK" : payMethod,
          note: `Payment for order #${order.id}`,
        }).catch(() => {});
      }

      setMessage(`✓ Sale #${order.id} — KES ${parseFloat(order.total_amount).toLocaleString()} · ${payMethod}`);
      setItems([emptyItem()]);
      setPaperBags("0");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Could not record sale.");
    } finally { setSubmitting(false); }
  };

  const filteredCustomers = customers.filter((c) =>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone_number || "").includes(custSearch)
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Point of Sale</Text>

      {message && (
        <View style={s.successBanner}>
          <Text style={s.successTxt}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close-circle" size={20} color="#166534" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Customer ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Customer</Text>
        <View style={s.customerToggle}>
          <TouchableOpacity style={[s.toggleBtn, isWalkIn && { backgroundColor: colors.primary }]}
            onPress={() => { setIsWalkIn(true); setCustomerId(""); }}>
            <Text style={[s.toggleTxt, isWalkIn && { color: "#fff" }]}>Walk-in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !isWalkIn && { backgroundColor: colors.primary }]}
            onPress={() => setIsWalkIn(false)}>
            <Text style={[s.toggleTxt, !isWalkIn && { color: "#fff" }]}>Customer</Text>
          </TouchableOpacity>
        </View>
        {!isWalkIn && (
          <TouchableOpacity style={s.customerPicker} onPress={() => setCustModal(true)}>
            <Text style={{ color: selectedCustomer ? "#111827" : "#9ca3af", fontSize: 14 }}>
              {selectedCustomer ? selectedCustomer.name : "Select customer..."}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
        {selectedCustomer && parseFloat(selectedCustomer.debt_balance) > 0 && (
          <View style={s.debtWarning}>
            <Text style={s.debtTxt}>⚠ Existing debt: KES {parseFloat(selectedCustomer.debt_balance).toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* ── Items ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Select Product</Text>

        {items.map((item, idx) => {
          const selectedCombo = combos.find(
            (c) => c.milk_type === item.milk_type && c.pack_size === item.pack_size
          );
          return (
            <View key={idx} style={[s.itemBlock, idx > 0 && { marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 16 }]}>
              {items.length > 1 && (
                <View style={s.itemHeaderRow}>
                  <Text style={s.itemNum}>Item {idx + 1}</Text>
                  <TouchableOpacity onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* 2-column card grid */}
              <View style={s.cardGrid}>
                {combos.map((combo) => {
                  const isSelected = item.milk_type === combo.milk_type && item.pack_size === combo.pack_size;
                  return (
                    <TouchableOpacity
                      key={combo.key}
                      style={[
                        s.productCard,
                        isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: "#f0fdf4" },
                      ]}
                      onPress={() => updateItem(idx, { milk_type: combo.milk_type, pack_size: combo.pack_size })}
                      activeOpacity={0.8}
                    >
                      {/* Icon placeholder */}
                      <View style={[s.cardIconBox, isSelected && { backgroundColor: colors.primary + "22" }]}>
                        <Ionicons
                          name="water-outline"
                          size={32}
                          color={isSelected ? colors.primary : "#9ca3af"}
                        />
                      </View>

                      {/* Name + pack */}
                      <Text style={s.cardName} numberOfLines={1}>{combo.milk_type_name}</Text>
                      <Text style={s.cardPack}>{combo.pack_size_label}</Text>

                      {/* Price badge */}
                      <View style={[s.priceBadge, isSelected && { backgroundColor: colors.primary }]}>
                        <Text style={[s.priceBadgeTxt, isSelected && { color: "#fff" }]}>
                          KES {combo.amount.toLocaleString()}
                        </Text>
                      </View>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <View style={[s.checkMark, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quantity — only shown after a combo is selected */}
              {item.milk_type && item.pack_size && (
                <View style={s.qtySection}>
                  <Text style={s.qtyLabel}>Quantity</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn}
                      onPress={() => updateItem(idx, { quantity: String(Math.max(1, (parseFloat(item.quantity) || 1) - 1)) })}>
                      <Text style={s.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={s.qtyInput}
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={(v) => updateItem(idx, { quantity: v })}
                    />
                    <TouchableOpacity style={s.qtyBtn}
                      onPress={() => updateItem(idx, { quantity: String((parseFloat(item.quantity) || 0) + 1) })}>
                      <Text style={s.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                    {lineTotal(item) > 0 && (
                      <Text style={[s.lineTotalTxt, { color: colors.primary }]}>
                        = KES {lineTotal(item).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={s.addItemBtn} onPress={() => setItems((p) => [...p, emptyItem()])}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={[s.addItemTxt, { color: colors.primary }]}>Add Another Item</Text>
        </TouchableOpacity>
      </View>

      {/* ── Payment Method ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Payment Method</Text>
        <View style={s.payGrid}>
          {PAYMENT_METHODS.map((pm) => (
            <TouchableOpacity key={pm.key}
              style={[s.payCard, payMethod === pm.key && { borderColor: pm.color, borderWidth: 2, backgroundColor: pm.color + "15" }]}
              onPress={() => setPayMethod(pm.key)}>
              <Ionicons name={pm.icon} size={22} color={payMethod === pm.key ? pm.color : "#9ca3af"} />
              <Text style={[s.payCardTxt, payMethod === pm.key && { color: pm.color, fontWeight: "700" }]}>{pm.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Paper bags ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Paper Bags</Text>
        <View style={s.qtyRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={() => setPaperBags(String(Math.max(0, parseInt(paperBags) - 1)))}>
            <Text style={s.qtyBtnTxt}>−</Text>
          </TouchableOpacity>
          <TextInput style={[s.qtyInput, { width: 60 }]} keyboardType="numeric" value={paperBags} onChangeText={setPaperBags} />
          <TouchableOpacity style={s.qtyBtn} onPress={() => setPaperBags(String((parseInt(paperBags) || 0) + 1))}>
            <Text style={s.qtyBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Total + Submit ── */}
      {orderTotal > 0 && (
        <View style={s.totalBar}>
          <Text style={s.totalLabel}>Order Total</Text>
          <Text style={[s.totalAmount, { color: colors.primary }]}>KES {orderTotal.toLocaleString()}</Text>
        </View>
      )}
      <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }]}
        onPress={handleSubmit} disabled={submitting}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        <Text style={s.submitTxt}>{submitting ? "Processing..." : "Complete Sale"}</Text>
      </TouchableOpacity>

      {/* Customer picker modal */}
      <Modal visible={custModal} transparent animationType="slide" onRequestClose={() => setCustModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCustModal(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Customer</Text>
            <TextInput style={s.search} placeholder="Search name or phone..."
              value={custSearch} onChangeText={setCustSearch} />
            <ScrollView style={{ maxHeight: 320 }}>
              {filteredCustomers.map((c) => (
                <TouchableOpacity key={c.id}
                  style={[s.custRow, String(c.id) === customerId && { backgroundColor: "#f0fdf4" }]}
                  onPress={() => { setCustomerId(String(c.id)); setCustModal(false); setCustSearch(""); }}>
                  <View>
                    <Text style={{ fontWeight: "600", color: "#111827" }}>{c.name}</Text>
                    {!!c.phone_number && <Text style={{ fontSize: 12, color: "#9ca3af" }}>{c.phone_number}</Text>}
                  </View>
                  {parseFloat(c.debt_balance) > 0 && (
                    <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "700" }}>
                      KES {parseFloat(c.debt_balance).toLocaleString()} debt
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", padding: 16, paddingBottom: 8 },
  successBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dcfce7", marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12 },
  successTxt: { color: "#166534", fontWeight: "600", flex: 1, fontSize: 13 },
  section: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  // Customer
  customerToggle: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", borderWidth: 1.5, borderColor: "#d1d5db" },
  toggleTxt: { fontWeight: "700", color: "#6b7280" },
  customerPicker: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" },
  debtWarning: { backgroundColor: "#fff7ed", borderRadius: 6, padding: 8, marginTop: 6 },
  debtTxt: { color: "#c2410c", fontSize: 12, fontWeight: "600" },

  // Item block
  itemBlock: {},
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemNum: { fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" },

  // Card grid
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  productCard: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 12,
    alignItems: "center",
    gap: 6,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconBox: {
    width: "100%",
    height: 70,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardName: { fontSize: 13, fontWeight: "700", color: "#111827", textAlign: "center" },
  cardPack: { fontSize: 11, color: "#6b7280", textAlign: "center" },
  priceBadge: { backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  priceBadgeTxt: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  checkMark: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Quantity
  qtySection: { marginTop: 12, backgroundColor: "#f9fafb", borderRadius: 10, padding: 10 },
  qtyLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { backgroundColor: "#e5e7eb", width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyBtnTxt: { fontSize: 20, color: "#374151", fontWeight: "700" },
  qtyInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: "center", width: 52, backgroundColor: "#fff", fontSize: 15, fontWeight: "700" },
  lineTotalTxt: { fontSize: 14, fontWeight: "800", marginLeft: 6 },

  addItemBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingTop: 12, justifyContent: "center" },
  addItemTxt: { fontWeight: "600", fontSize: 14 },

  // Payment
  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  payCard: { width: "47%", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff", padding: 14, alignItems: "center", gap: 6 },
  payCardTxt: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },

  // Total
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  totalLabel: { fontSize: 15, color: "#374151" },
  totalAmount: { fontSize: 20, fontWeight: "800" },
  submitBtn: { flexDirection: "row", gap: 8, marginHorizontal: 12, borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10, maxHeight: "80%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  search: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  custRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingHorizontal: 4, borderRadius: 8 },
});
