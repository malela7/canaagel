import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";
import { colors } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "MPESA", label: "M-Pesa" },
  { key: "BANK", label: "Bank" },
  { key: "OTHER", label: "Other" },
];

// ── Receipt overlay ────────────────────────────────────────
function Receipt({ sale, onClose }) {
  if (!sale) return null;
  return (
    <View style={st.receiptOverlay}>
      <View style={st.receiptCard}>
        <View style={st.receiptHeader}>
          <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
          <Text style={st.receiptTitle}>Sale Recorded!</Text>
        </View>
        <Text style={st.receiptId}>#{sale.id}</Text>
        <Text style={st.receiptCustomer}>{sale.customer_name || "Walk-in"}</Text>
        <View style={st.divider} />
        {(sale.items || []).map((it, i) => (
          <View key={i} style={st.receiptLine}>
            <Text style={st.receiptItemName}>{it.product_name || it.name}</Text>
            <Text style={st.receiptItemQty}>{it.quantity} × KES {it.unit_price}</Text>
            <Text style={st.receiptItemTotal}>KES {it.line_total}</Text>
          </View>
        ))}
        <View style={st.divider} />
        <View style={st.receiptTotalRow}>
          <Text style={st.receiptTotalLabel}>Total</Text>
          <Text style={st.receiptTotalValue}>KES {parseFloat(sale.total_amount).toFixed(2)}</Text>
        </View>
        <View style={st.receiptStatusRow}>
          <View style={[st.statusBadge, sale.payment_status === "PAID" ? st.statusPaid : st.statusUnpaid]}>
            <Text style={[st.statusText, sale.payment_status === "PAID" ? st.statusPaidText : st.statusUnpaidText]}>
              {sale.payment_status === "PAID" ? "PAID" : "BILLED — added to account"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={st.closeBtn} onPress={onClose}>
          <Text style={st.closeBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── POS Screen ────────────────────────────────────────────
export default function POSScreen() {
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Cart
  const [milkCart, setMilkCart] = useState({});
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paperBags, setPaperBags] = useState("0");
  const [step, setStep] = useState("products"); // "products" | "checkout"
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      api.get("/inventory/prices/"),
      api.get("/inventory/stock/"),
      api.get("/sales/customers/?page_size=200"),
    ]).then(([p, s, c]) => {
      setPrices(p.data.results || p.data);
      setStock(s.data.results || s.data);
      setCustomers(c.data.results || c.data);
    }).catch(() => {
      setLoadError("Failed to load. Tap to retry.");
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const stockByCombo = useMemo(() => {
    const map = {};
    stock.forEach((s) => { map[`${s.milk_type}-${s.pack_size}`] = s; });
    return map;
  }, [stock]);

  const cart = milkCart;
  const setCart = setMilkCart;

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const total = cartItems.reduce((sum, it) => sum + it.amount * it.quantity, 0);

  const addToCart = (item) => {
    const key = item.key;
    setCart((prev) => ({
      ...prev,
      [key]: {
        ...item,
        quantity: (prev[key]?.quantity || 0) + 1,
      },
    }));
  };

  const changeQuantity = (key, delta) => {
    setCart((prev) => {
      const item = prev[key];
      if (!item) return prev;
      const quantity = item.quantity + delta;
      if (quantity <= 0) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { ...item, quantity } };
    });
  };

  const resetSale = () => {
    setMilkCart({});
    setPaperBags("0");
    setStep("products");
    setCustomerId("");
    setPaymentMethod("CASH");
  };

  const handleSubmitMilk = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/sales/orders/", {
        customer: customerId || null,
        is_walk_in: !customerId,
        paper_bags_used: Number(paperBags) || 0,
        payment_method: paymentMethod,
        items: cartItems.map((it) => ({
          milk_type: it.milk_type,
          pack_size: it.pack_size,
          quantity: it.quantity,
        })),
      });
      // Build receipt-compatible shape
      const receiptData = {
        id: data.id,
        customer_name: customers.find((c) => String(c.id) === customerId)?.name || "Walk-in",
        total_amount: data.total_amount,
        payment_status: data.payment_status,
        items: data.items?.map((it) => ({
          product_name: `${it.milk_type_name || ""} ${it.pack_size_label || ""}`.trim(),
          quantity: it.quantity,
          unit_price: it.unit_price,
          line_total: it.line_total,
        })) || cartItems.map((it) => ({
          product_name: `${it.name} ${it.label}`,
          quantity: it.quantity,
          unit_price: it.amount,
          line_total: it.amount * it.quantity,
        })),
      };
      setReceipt(receiptData);
      setMilkCart({});
      setStep("products");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Could not record this sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProducts = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/sales/product-sales/", {
        customer: customerId || null,
        is_walk_in: !customerId,
        payment_method: paymentMethod,
        items: cartItems.map((it) => ({
          product: it.productId,
          quantity: it.quantity,
        })),
      });
      setReceipt(data);
      setProductCart({});
      setStep("products");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Could not record this sale.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={st.loadingText}>Loading POS…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={st.center}>
        <Text style={st.errorText}>{loadError}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={loadData}>
          <Text style={st.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {receipt && (
        <Receipt sale={receipt} onClose={() => { setReceipt(null); loadData(); }} />
      )}

      <ScrollView style={st.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={st.title}>Point of Sale</Text>

        {/* Customer picker */}
        <Text style={st.label}>Customer</Text>
        <View style={st.pickerWrap}>
          <Picker selectedValue={customerId} onValueChange={setCustomerId}>
            <Picker.Item label="Walk-in" value="" />
            {customers.map((c) => (
              <Picker.Item key={c.id} label={`${c.name}${parseFloat(c.debt_balance) > 0 ? " ⚠ owes KES " + c.debt_balance : ""}`} value={String(c.id)} />
            ))}
          </Picker>
        </View>

        {/* ── Milk products ── */}
        {step === "products" && (
          <>
            <View style={st.rowBetween}>
              <Text style={st.label}>Tap a product to add</Text>
              <Text style={st.meta}>{cartCount} in cart</Text>
            </View>
            <View style={st.grid}>
              {prices.map((price) => {
                const combo = stockByCombo[`${price.milk_type}-${price.pack_size}`];
                const outOfStock = combo && Number(combo.quantity) <= 0;
                const inCart = milkCart[`${price.milk_type}-${price.pack_size}`]?.quantity || 0;
                return (
                  <TouchableOpacity
                    key={price.id}
                    disabled={outOfStock}
                    onPress={() => addToCart({
                      key: `${price.milk_type}-${price.pack_size}`,
                      milk_type: price.milk_type,
                      pack_size: price.pack_size,
                      name: price.milk_type_name,
                      label: price.pack_size_label,
                      amount: Number(price.amount),
                      quantity: 0,
                    })}
                    style={[st.tile, outOfStock && st.tileDisabled]}
                  >
                    {inCart > 0 && <View style={st.cartBadge}><Text style={st.cartBadgeText}>{inCart}</Text></View>}
                    <Text style={st.tileTitle}>{price.milk_type_name}</Text>
                    <Text style={st.tileSub}>{price.pack_size_label}</Text>
                    <Text style={st.tilePrice}>{outOfStock ? "Out of stock" : `KES ${price.amount}`}</Text>
                  </TouchableOpacity>
                );
              })}
              {prices.length === 0 && <Text style={st.meta}>No prices set. Configure in Inventory first.</Text>}
            </View>
            <TouchableOpacity
              disabled={cartItems.length === 0}
              onPress={() => setStep("checkout")}
              style={[st.button, cartItems.length === 0 && st.buttonDisabled]}
            >
              <Text style={st.buttonText}>Review cart ({cartCount})</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Checkout ── */}
        {step === "checkout" && (
          <View>
            <TouchableOpacity onPress={() => setStep("products")} style={st.backRow}>
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={st.backText}>Back to products</Text>
            </TouchableOpacity>

            {/* Cart items */}
            {cartItems.map((it) => (
              <View key={it.key} style={st.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cartItemName}>{it.name}{it.label ? ` ${it.label}` : ""}</Text>
                  <Text style={st.cartItemPrice}>KES {it.amount.toFixed(2)} each</Text>
                </View>
                <View style={st.stepper}>
                  <TouchableOpacity style={st.stepBtn} onPress={() => changeQuantity(it.key, -1)}>
                    <Text style={st.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={st.stepVal}>{it.quantity}</Text>
                  <TouchableOpacity style={st.stepBtn} onPress={() => changeQuantity(it.key, 1)}>
                    <Text style={st.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={st.lineTotal}>KES {(it.amount * it.quantity).toFixed(2)}</Text>
              </View>
            ))}

            {/* Customer bill note */}
            {customerId && (() => {
              const c = customers.find((x) => String(x.id) === customerId);
              return c?.payment_schedule !== "CASH" ? (
                <View style={st.billNote}>
                  <Ionicons name="information-circle-outline" size={16} color="#b45309" />
                  <Text style={st.billNoteText}>
                    {c.name} has a {c.payment_schedule.toLowerCase()} account — this will be added to their bill.
                  </Text>
                </View>
              ) : null;
            })()}

            {/* Total */}
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>Total</Text>
              <Text style={st.totalValue}>KES {total.toFixed(2)}</Text>
            </View>

            {/* Paper bags */}
            <Text style={st.label}>Paper bags used</Text>
            <TextInput
              style={st.smallInput}
              keyboardType="numeric"
              value={paperBags}
              onChangeText={setPaperBags}
            />

            {/* Payment method */}
            <Text style={st.label}>Payment method</Text>
            <View style={st.paymentRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setPaymentMethod(m.key)}
                  style={[st.payTile, paymentMethod === m.key && st.payTileActive]}
                >
                  <Text style={[st.payTileText, paymentMethod === m.key && st.payTileTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confirm */}
            <TouchableOpacity
              style={[st.button, submitting && st.buttonDisabled]}
              onPress={handleSubmitMilk}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.buttonText}>Confirm sale — KES {total.toFixed(2)}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={st.clearBtn} onPress={resetSale}>
              <Text style={st.clearBtnText}>Clear & start over</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, padding: 16 },
  loadingText: { marginTop: 8, color: colors.textSecondary },
  errorText: { color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: "#fff", fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },

  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12, backgroundColor: "#f3f4f6", borderRadius: 10, padding: 4 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8 },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  modeBtnTextActive: { color: "#fff" },

  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.textSecondary },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: "#fff", marginBottom: 4 },
  smallInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: "#fff", color: colors.text, width: 80 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  tile: { width: "31%", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: "#fff", alignItems: "center", position: "relative" },
  tileDisabled: { opacity: 0.45, backgroundColor: "#f3f4f6" },
  tileWarning: { borderColor: "#fbbf24" },
  tileTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", color: colors.text },
  tileSub: { fontSize: 10, color: colors.textSecondary, textAlign: "center" },
  tilePrice: { fontSize: 11, color: colors.primary, marginTop: 4, textAlign: "center", fontWeight: "600" },
  tileStockWarn: { fontSize: 9, color: "#b45309", marginTop: 2 },
  cartBadge: { position: "absolute", top: -6, right: -6, backgroundColor: colors.primary, borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Product mode 2-column cards
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  productCard: { backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.border, position: "relative", overflow: "hidden" },
  productCardOut: { opacity: 0.6 },
  productImageBox: { height: 80, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  productCartBadge: { position: "absolute", top: 6, right: 6, backgroundColor: colors.primary, borderRadius: 12, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  productCartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  productName: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPriceBadge: { backgroundColor: "#dcfce7", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  productPriceBadgeOut: { backgroundColor: "#f3f4f6" },
  productPriceText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  productAddBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  clearBtn: { alignItems: "center", paddingVertical: 12 },
  clearBtnText: { color: "#6b7280", fontSize: 13 },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { color: colors.textSecondary, fontSize: 13 },

  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 8 },
  cartItemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  cartItemPrice: { fontSize: 11, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 28, height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  stepBtnText: { fontSize: 16, color: colors.text, lineHeight: 20 },
  stepVal: { width: 24, textAlign: "center", fontSize: 14, fontWeight: "600" },
  lineTotal: { fontSize: 13, fontWeight: "700", color: colors.text, minWidth: 70, textAlign: "right" },

  billNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#fffbeb", borderRadius: 8, padding: 10, marginTop: 10 },
  billNoteText: { flex: 1, fontSize: 12, color: "#92400e" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, marginTop: 4, borderTopWidth: 2, borderTopColor: "#e5e7eb" },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },

  paymentRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  payTile: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, alignItems: "center", backgroundColor: "#fff" },
  payTileActive: { borderColor: colors.primary, backgroundColor: "#f0fdf4" },
  payTileText: { fontSize: 12, color: colors.text },
  payTileTextActive: { color: colors.primary, fontWeight: "700" },

  // Receipt
  receiptOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 99 },
  receiptCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "90%", maxWidth: 360 },
  receiptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  receiptTitle: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
  receiptId: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  receiptCustomer: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },
  receiptLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, alignItems: "center" },
  receiptItemName: { flex: 1, fontSize: 13, color: colors.text },
  receiptItemQty: { fontSize: 12, color: colors.textSecondary, marginHorizontal: 8 },
  receiptItemTotal: { fontSize: 13, fontWeight: "600", color: colors.text },
  receiptTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  receiptTotalLabel: { fontSize: 16, fontWeight: "700" },
  receiptTotalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  receiptStatusRow: { alignItems: "center", marginTop: 10 },
  statusBadge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
  statusPaid: { backgroundColor: "#dcfce7" },
  statusUnpaid: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 12, fontWeight: "700" },
  statusPaidText: { color: "#16a34a" },
  statusUnpaidText: { color: "#92400e" },
  closeBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center", marginTop: 14 },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
