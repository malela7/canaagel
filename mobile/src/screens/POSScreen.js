import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 36) / 2; // 2 columns, 12px sides + 12px gap

const PAYMENT_METHODS = [
  { key: "CASH",    label: "Cash",        icon: "cash-outline",           color: "#16a34a" },
  { key: "MPESA",   label: "M-Pesa",      icon: "phone-portrait-outline", color: "#22c55e" },
  { key: "PAYBILL", label: "PayBill",     icon: "business-outline",       color: "#0ea5e9" },
  { key: "CREDIT",  label: "Credit/Debt", icon: "time-outline",           color: "#f59e0b" },
];

export default function POSScreen() {
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const [milkTypes, setMilkTypes]   = useState([]);
  const [packSizes, setPackSizes]   = useState([]);
  const [prices, setPrices]         = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [cart, setCart]             = useState([]); // [{ milk_type, pack_size, milk_type_name, pack_size_label, amount, qty }]
  const [search, setSearch]         = useState("");
  const [customerId, setCustomerId] = useState("");
  const [isWalkIn, setIsWalkIn]     = useState(true);
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

  const combos = prices.map((p) => ({
    key: `${p.milk_type}-${p.pack_size}`,
    milk_type: String(p.milk_type),
    pack_size: String(p.pack_size),
    milk_type_name: p.milk_type_name || milkTypes.find((m) => String(m.id) === String(p.milk_type))?.name || "—",
    pack_size_label: p.pack_size_label || packSizes.find((ps) => String(ps.id) === String(p.pack_size))?.label || "—",
    amount: parseFloat(p.amount) || 0,
  }));

  const filteredCombos = combos.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.milk_type_name.toLowerCase().includes(q) || c.pack_size_label.toLowerCase().includes(q);
  });

  const addToCart = (combo) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === combo.key);
      if (existing) return prev.map((i) => i.key === combo.key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...combo, qty: 1 }];
    });
  };

  const setCartQty = (key, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== key));
    } else {
      setCart((prev) => prev.map((i) => i.key === key ? { ...i, qty } : i));
    }
  };

  const cartQty = (key) => cart.find((i) => i.key === key)?.qty || 0;
  const orderTotal = cart.reduce((s, i) => s + i.amount * i.qty, 0);
  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  const handleSubmit = async () => {
    if (!cart.length) { Alert.alert("Error", "Add at least one product."); return; }
    setSubmitting(true); setMessage(null);
    try {
      const payload = {
        customer: isWalkIn ? null : (customerId || null),
        is_walk_in: isWalkIn,
        paper_bags_used: Number(paperBags) || 0,
        items: cart.map((i) => ({
          milk_type: Number(i.milk_type),
          pack_size: Number(i.pack_size),
          quantity: String(i.qty),
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
      setCart([]);
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

      {message && (
        <View style={s.successBanner}>
          <Text style={s.successTxt}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close-circle" size={20} color="#166534" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search products by name / pack size..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Product card grid ── */}
      <View style={s.grid}>
        {filteredCombos.length === 0 && (
          <Text style={s.emptyTxt}>No products found. Set prices in Inventory first.</Text>
        )}
        {filteredCombos.map((combo) => {
          const inCart = cartQty(combo.key);
          return (
            <View key={combo.key} style={s.card}>
              {/* In-cart badge */}
              {inCart > 0 && (
                <View style={[s.cartBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.cartBadgeTxt}>{inCart}</Text>
                </View>
              )}

              {/* Image placeholder */}
              <View style={s.cardImgBox}>
                <Ionicons name="camera-outline" size={36} color="#9ca3af" />
                <Text style={s.noImgTxt}>NO IMAGE{"\n"}AVAILABLE</Text>
              </View>

              {/* Product name */}
              <Text style={s.cardName}>{combo.milk_type_name}</Text>
              <Text style={s.cardPack}>{combo.pack_size_label}</Text>

              {/* Price row */}
              <View style={s.priceRow}>
                <View style={[s.kshBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.kshTxt}>Ksh</Text>
                </View>
                <Text style={s.priceAmt}>{combo.amount.toLocaleString()}</Text>
              </View>

              {/* Add to Cart / qty controls */}
              {inCart === 0 ? (
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => addToCart(combo)}
                >
                  <Ionicons name="cart-outline" size={16} color="#fff" />
                  <Text style={s.addBtnTxt}>Add to Cart</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.qtyControl, { borderColor: colors.primary }]}>
                  <TouchableOpacity style={s.qtyMinus} onPress={() => setCartQty(combo.key, inCart - 1)}>
                    <Text style={[s.qtySymbol, { color: colors.primary }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[s.qtyNum, { color: colors.primary }]}>{inCart}</Text>
                  <TouchableOpacity style={s.qtyPlus} onPress={() => setCartQty(combo.key, inCart + 1)}>
                    <Text style={[s.qtySymbol, { color: "#fff" }]}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Cart summary ── */}
      {cart.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})</Text>
          {cart.map((item) => (
            <View key={item.key} style={s.cartRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cartItemName}>{item.milk_type_name} · {item.pack_size_label}</Text>
                <Text style={s.cartItemSub}>KES {item.amount} × {item.qty}</Text>
              </View>
              <Text style={[s.cartItemTotal, { color: colors.primary }]}>
                KES {(item.amount * item.qty).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Customer ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Customer</Text>
        <View style={s.customerToggle}>
          <TouchableOpacity style={[s.toggleBtn, isWalkIn && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setIsWalkIn(true); setCustomerId(""); }}>
            <Text style={[s.toggleTxt, isWalkIn && { color: "#fff" }]}>Walk-in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !isWalkIn && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setIsWalkIn(false)}>
            <Text style={[s.toggleTxt, !isWalkIn && { color: "#fff" }]}>Registered</Text>
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
        <View style={s.bagRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={() => setPaperBags(String(Math.max(0, parseInt(paperBags) - 1)))}>
            <Text style={s.qtyBtnTxt}>−</Text>
          </TouchableOpacity>
          <TextInput style={s.qtyInput} keyboardType="numeric" value={paperBags} onChangeText={setPaperBags} />
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
      <TouchableOpacity
        style={[s.submitBtn, { backgroundColor: colors.primary }, !cart.length && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={submitting || !cart.length}
      >
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        <Text style={s.submitTxt}>{submitting ? "Processing..." : "Complete Sale"}</Text>
      </TouchableOpacity>

      {/* Customer picker modal */}
      <Modal visible={custModal} transparent animationType="slide" onRequestClose={() => setCustModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCustModal(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Customer</Text>
            <TextInput style={s.modalSearch} placeholder="Search name or phone..."
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
  root: { flex: 1, backgroundColor: "#f3f4f6" },

  successBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dcfce7", margin: 12, borderRadius: 10, padding: 12 },
  successTxt: { color: "#166534", fontWeight: "600", flex: 1, fontSize: 13 },

  // Search
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12, marginBottom: 4 },
  emptyTxt: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24, width: "100%" },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  cartBadge: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", zIndex: 2 },
  cartBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  cardImgBox: { backgroundColor: "#f3f4f6", borderRadius: 10, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 10, gap: 4 },
  noImgTxt: { fontSize: 9, color: "#9ca3af", fontWeight: "700", textAlign: "center", letterSpacing: 0.5 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  cardPack: { fontSize: 12, color: "#6b7280", marginBottom: 8 },

  // Price
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  kshBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  kshTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  priceAmt: { fontSize: 18, fontWeight: "800", color: "#111827" },

  // Add to Cart button
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 10 },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Qty control (in-cart state)
  qtyControl: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1.5, overflow: "hidden" },
  qtyMinus: { flex: 1, alignItems: "center", paddingVertical: 8 },
  qtyNum: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800" },
  qtyPlus: { flex: 1, alignItems: "center", paddingVertical: 8, backgroundColor: "#16a34a" },
  qtySymbol: { fontSize: 18, fontWeight: "700" },

  // Sections
  section: { backgroundColor: "#fff", marginHorizontal: 12, marginTop: 10, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  // Cart rows
  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  cartItemName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  cartItemSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  cartItemTotal: { fontSize: 14, fontWeight: "800" },

  // Customer
  customerToggle: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", borderWidth: 1.5, borderColor: "#d1d5db" },
  toggleTxt: { fontWeight: "700", color: "#6b7280" },
  customerPicker: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" },
  debtWarning: { backgroundColor: "#fff7ed", borderRadius: 6, padding: 8, marginTop: 6 },
  debtTxt: { color: "#c2410c", fontSize: 12, fontWeight: "600" },

  // Payment
  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  payCard: { width: "47%", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff", padding: 14, alignItems: "center", gap: 6 },
  payCardTxt: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },

  // Paper bags
  bagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { backgroundColor: "#e5e7eb", width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyBtnTxt: { fontSize: 20, color: "#374151", fontWeight: "700" },
  qtyInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: "center", width: 52, backgroundColor: "#fff", fontSize: 15, fontWeight: "700" },

  // Total
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 12, marginTop: 10, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  totalLabel: { fontSize: 15, color: "#374151" },
  totalAmount: { fontSize: 22, fontWeight: "800" },
  submitBtn: { flexDirection: "row", gap: 8, marginHorizontal: 12, marginTop: 12, borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  submitTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10, maxHeight: "80%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalSearch: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  custRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingHorizontal: 4, borderRadius: 8 },
});
