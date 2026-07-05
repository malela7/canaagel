import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, Dimensions, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 40) / 2;

const PAYMENT_METHODS = [
  { key: "CASH",    label: "Cash",       icon: "cash-outline",           color: "#16a34a" },
  { key: "MPESA",   label: "Send Money", icon: "phone-portrait-outline", color: "#22c55e" },
  { key: "PAYBILL", label: "PayBill",    icon: "business-outline",       color: "#0ea5e9" },
  { key: "CREDIT",  label: "Credit",     icon: "time-outline",           color: "#f59e0b" },
];

export default function POSScreen() {
  const { accent } = useTheme();
  const colors = { primary: accent?.value || "#16a34a" };

  const [combos, setCombos]         = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [cart, setCart]             = useState({});   // { comboKey: qty }
  const [isWalkIn, setIsWalkIn]     = useState(true);
  const [customerId, setCustomerId] = useState(null);
  const [payMethod, setPayMethod]   = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage]       = useState(null);
  const [custModal, setCustModal]   = useState(false);
  const [custSearch, setCustSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/inventory/milk-types/"),
      api.get("/inventory/pack-sizes/"),
      api.get("/inventory/prices/"),
    ]).then(([mt, ps, pr]) => {
      const milkTypes = mt.data.results || mt.data;
      const packSizes = ps.data.results || ps.data;
      const prices    = pr.data.results || pr.data;
      setCombos(prices.map((p) => ({
        key: `${p.milk_type}-${p.pack_size}`,
        milk_type: p.milk_type,
        pack_size: p.pack_size,
        milk_name: p.milk_type_name || milkTypes.find((m) => m.id === p.milk_type)?.name || "—",
        pack_label: p.pack_size_label || packSizes.find((s) => s.id === p.pack_size)?.label || "—",
        sell_price: parseFloat(p.amount) || 0,
        cost_price: parseFloat(p.cost_price) || 0,
        bulk_price: parseFloat(p.bulk_price) || 0,
      })));
    });
    api.get("/sales/customers/?page_size=200").then((r) =>
      setCustomers(r.data.results || r.data)
    );
  }, []);

  const setQty = (key, delta) =>
    setCart((prev) => {
      const next = Math.max(0, (prev[key] || 0) + delta);
      if (next === 0) { const c = { ...prev }; delete c[key]; return c; }
      return { ...prev, [key]: next };
    });

  const cartItems = combos.filter((c) => cart[c.key] > 0);
  const orderTotal = cartItems.reduce((s, c) => s + c.sell_price * cart[c.key], 0);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = async () => {
    if (!cartItems.length) { Alert.alert("Empty", "Add at least one product."); return; }
    setSubmitting(true); setMessage(null);
    try {
      const { data: order } = await api.post("/sales/orders/", {
        customer: isWalkIn ? null : customerId,
        is_walk_in: isWalkIn,
        paper_bags_used: 0,
        items: cartItems.map((c) => ({
          milk_type: c.milk_type,
          pack_size: c.pack_size,
          quantity: String(cart[c.key]),
        })),
      });
      if (!isWalkIn && customerId && payMethod !== "CREDIT") {
        await api.post("/sales/payments/", {
          customer: customerId,
          amount: order.total_amount,
          method: payMethod === "PAYBILL" ? "BANK" : payMethod,
          note: `Order #${order.id}`,
        }).catch(() => {});
      }
      setMessage(`✓ Sale #${order.id} — KES ${parseFloat(order.total_amount).toLocaleString()}`);
      setCart({});
    } catch (e) {
      Alert.alert("Error", e.response?.data?.detail || "Could not record sale.");
    } finally { setSubmitting(false); }
  };

  const filteredCustomers = customers.filter((c) =>
    !custSearch ||
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.phone_number || "").includes(custSearch)
  );

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Success banner ── */}
        {message && (
          <View style={s.banner}>
            <Text style={s.bannerTxt}>{message}</Text>
            <TouchableOpacity onPress={() => setMessage(null)}>
              <Ionicons name="close-circle" size={18} color="#166534" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Customer row ── */}
        <View style={s.customerCard}>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, isWalkIn && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => { setIsWalkIn(true); setCustomerId(null); }}
            >
              <Ionicons name="walk-outline" size={14} color={isWalkIn ? "#fff" : "#6b7280"} />
              <Text style={[s.toggleTxt, isWalkIn && { color: "#fff" }]}>Walk-in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleBtn, !isWalkIn && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setIsWalkIn(false)}
            >
              <Ionicons name="person-outline" size={14} color={!isWalkIn ? "#fff" : "#6b7280"} />
              <Text style={[s.toggleTxt, !isWalkIn && { color: "#fff" }]}>Customer</Text>
            </TouchableOpacity>

            {/* + add customer shortcut */}
            <TouchableOpacity style={[s.plusBtn, { borderColor: colors.primary }]}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Customer picker */}
          {!isWalkIn && (
            <TouchableOpacity style={s.custPicker} onPress={() => setCustModal(true)}>
              {selectedCustomer ? (
                <View style={{ flex: 1 }}>
                  <Text style={s.custName}>{selectedCustomer.name}</Text>
                  {parseFloat(selectedCustomer.debt_balance) > 0 && (
                    <Text style={s.debtTxt}>⚠ Debt: KES {parseFloat(selectedCustomer.debt_balance).toLocaleString()}</Text>
                  )}
                </View>
              ) : (
                <Text style={s.custPlaceholder}>Select customer from list...</Text>
              )}
              <Ionicons name="chevron-down" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Product / goods / milk ── */}
        <Text style={s.sectionLabel}>PRODUCT / GOODS / MILK</Text>
        {combos.length === 0 && (
          <Text style={s.emptyHint}>No products set up. Add prices in Inventory first.</Text>
        )}
        <View style={s.grid}>
          {combos.map((combo) => {
            const qty = cart[combo.key] || 0;
            const isInCart = qty > 0;
            return (
              <View key={combo.key} style={[s.card, isInCart && { borderColor: colors.primary, borderWidth: 2 }]}>
                {/* Milk name + pack */}
                <View style={s.cardTop}>
                  <Text style={s.cardMilkName} numberOfLines={1}>{combo.milk_name}</Text>
                  <View style={[s.packBadge, { backgroundColor: colors.primary }]}>
                    <Text style={s.packBadgeTxt}>{combo.pack_label}</Text>
                  </View>
                </View>

                {/* Prices */}
                <View style={s.priceBlock}>
                  <View style={s.priceRow}>
                    <Text style={s.priceLabel}>Sell</Text>
                    <Text style={[s.priceVal, { color: colors.primary }]}>KES {combo.sell_price}</Text>
                  </View>
                  {combo.cost_price > 0 && (
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Cost</Text>
                      <Text style={s.priceVal}>KES {combo.cost_price}</Text>
                    </View>
                  )}
                  {combo.bulk_price > 0 && (
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Bulk</Text>
                      <Text style={s.priceVal}>KES {combo.bulk_price}</Text>
                    </View>
                  )}
                </View>

                {/* Qty control */}
                <View style={[s.qtyRow, isInCart && { backgroundColor: colors.primary + "18" }]}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(combo.key, -1)}>
                    <Text style={[s.qtySym, { color: qty > 0 ? "#dc2626" : "#d1d5db" }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[s.qtyNum, isInCart && { color: colors.primary }]}>{qty}</Text>
                  <TouchableOpacity style={[s.qtyBtn, { backgroundColor: colors.primary }]} onPress={() => setQty(combo.key, 1)}>
                    <Text style={[s.qtySym, { color: "#fff" }]}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Line total */}
                {isInCart && (
                  <Text style={[s.lineTotal, { color: colors.primary }]}>
                    = KES {(combo.sell_price * qty).toLocaleString()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Payment ── */}
        <Text style={s.sectionLabel}>PAYMENT</Text>
        <View style={s.payRow}>
          {PAYMENT_METHODS.map((pm) => (
            <TouchableOpacity
              key={pm.key}
              style={[s.payBtn, payMethod === pm.key && { backgroundColor: pm.color, borderColor: pm.color }]}
              onPress={() => setPayMethod(pm.key)}
            >
              <Ionicons name={pm.icon} size={18} color={payMethod === pm.key ? "#fff" : "#6b7280"} />
              <Text style={[s.payBtnTxt, payMethod === pm.key && { color: "#fff", fontWeight: "700" }]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Order total ── */}
        {orderTotal > 0 && (
          <View style={[s.totalBar, { borderLeftColor: colors.primary }]}>
            <Text style={s.totalLabel}>Order Total</Text>
            <Text style={[s.totalAmt, { color: colors.primary }]}>KES {orderTotal.toLocaleString()}</Text>
          </View>
        )}

        {/* ── Complete button ── */}
        <TouchableOpacity
          style={[s.completeBtn, { backgroundColor: colors.primary }, (!cartItems.length || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || !cartItems.length}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={s.completeTxt}>{submitting ? "Processing..." : "Complete"}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Customer list modal ── */}
      <Modal visible={custModal} transparent animationType="slide" onRequestClose={() => setCustModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCustModal(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>List of Customers</Text>
            <TextInput
              style={s.modalSearch}
              placeholder="Search by name or phone..."
              value={custSearch}
              onChangeText={setCustSearch}
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={(c) => String(c.id)}
              style={{ maxHeight: 360 }}
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  style={[s.custRow, String(c.id) === String(customerId) && { backgroundColor: "#f0fdf4" }]}
                  onPress={() => { setCustomerId(c.id); setCustModal(false); setCustSearch(""); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.custRowName}>{c.name}</Text>
                    {!!c.phone_number && <Text style={s.custRowPhone}>{c.phone_number}</Text>}
                  </View>
                  {parseFloat(c.debt_balance) > 0 && (
                    <Text style={s.custRowDebt}>KES {parseFloat(c.debt_balance).toLocaleString()} debt</Text>
                  )}
                  {String(c.id) === String(customerId) && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.emptyHint}>No customers found.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3f4f6" },
  scroll: { padding: 12, paddingBottom: 40 },

  // Banner
  banner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dcfce7", borderRadius: 10, padding: 12, marginBottom: 10 },
  bannerTxt: { color: "#166534", fontWeight: "600", flex: 1, fontSize: 13 },

  // Customer card
  customerCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 10 },
  toggleTxt: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  plusBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  custPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#f9fafb" },
  custName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  custPlaceholder: { fontSize: 14, color: "#9ca3af" },
  debtTxt: { fontSize: 11, color: "#dc2626", fontWeight: "600", marginTop: 2 },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  emptyHint: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginVertical: 16 },

  // Product grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  cardMilkName: { fontSize: 14, fontWeight: "800", color: "#111827", flex: 1, marginRight: 6 },
  packBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  packBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },

  priceBlock: { gap: 3, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 6 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "700", textTransform: "uppercase" },
  priceVal: { fontSize: 12, fontWeight: "700", color: "#374151" },

  // Qty controls
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 4, marginTop: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" },
  qtySym: { fontSize: 20, fontWeight: "700" },
  qtyNum: { fontSize: 18, fontWeight: "800", color: "#374151", minWidth: 28, textAlign: "center" },
  lineTotal: { fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 2 },

  // Payment
  payRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#fff" },
  payBtnTxt: { fontSize: 13, color: "#6b7280", fontWeight: "600" },

  // Total bar
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4 },
  totalLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },
  totalAmt: { fontSize: 22, fontWeight: "800" },

  // Complete button
  completeBtn: { flexDirection: "row", gap: 8, borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  completeTxt: { color: "#fff", fontWeight: "800", fontSize: 17 },

  // Customer modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#d1d5db", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },
  modalSearch: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, marginBottom: 8 },
  custRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingHorizontal: 4 },
  custRowName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  custRowPhone: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  custRowDebt: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
});
