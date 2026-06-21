import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "MPESA", label: "M-Pesa" },
  { key: "BANK", label: "Bank" },
  { key: "OTHER", label: "Other" },
];

export default function POSScreen() {
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState({});
  const [paperBags, setPaperBags] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [step, setStep] = useState("products");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/inventory/prices/"),
      api.get("/inventory/stock/"),
      api.get("/sales/customers/?page_size=100"),
    ]).then(([pricesRes, stockRes, customersRes]) => {
      setPrices(pricesRes.data.results || pricesRes.data);
      setStock(stockRes.data.results || stockRes.data);
      setCustomers(customersRes.data.results || customersRes.data);
    }).catch(() => {
      setLoadError("Failed to load products. Pull to retry or reopen this screen.");
    }).finally(() => setLoading(false));
  }, []);

  const stockByCombo = useMemo(() => {
    const map = {};
    stock.forEach((s) => { map[`${s.milk_type}-${s.pack_size}`] = s; });
    return map;
  }, [stock]);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const total = cartItems.reduce((sum, it) => sum + it.amount * it.quantity, 0);

  const addToCart = (price) => {
    const key = `${price.milk_type}-${price.pack_size}`;
    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          milk_type: price.milk_type,
          pack_size: price.pack_size,
          name: price.milk_type_name,
          label: price.pack_size_label,
          amount: Number(price.amount),
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
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

  const handleSubmit = async () => {
    setMessage(null);
    try {
      const payload = {
        customer: customerId || null,
        is_walk_in: !customerId,
        paper_bags_used: Number(paperBags) || 0,
        payment_method: paymentMethod,
        items: cartItems.map((it) => ({
          milk_type: it.milk_type,
          pack_size: it.pack_size,
          quantity: it.quantity,
        })),
      };
      const { data } = await api.post("/sales/orders/", payload);
      setMessage(`Order #${data.id} recorded. Total: KES ${data.total_amount} (${data.payment_status})`);
      setCart({});
      setPaperBags("0");
      setStep("products");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Could not record this sale.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Point of Sale</Text>
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Text style={styles.label}>Customer</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={customerId} onValueChange={setCustomerId}>
          <Picker.Item label="Walk-in" value="" />
          {customers.map((c) => <Picker.Item key={c.id} label={c.name} value={String(c.id)} />)}
        </Picker>
      </View>

      {step === "products" ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Tap a product to add it</Text>
            <Text style={styles.meta}>{cartCount} item{cartCount === 1 ? "" : "s"} in cart</Text>
          </View>
          <View style={styles.grid}>
            {prices.map((price) => {
              const combo = stockByCombo[`${price.milk_type}-${price.pack_size}`];
              const outOfStock = combo && Number(combo.quantity) <= 0;
              return (
                <TouchableOpacity
                  key={price.id}
                  disabled={outOfStock}
                  onPress={() => addToCart(price)}
                  style={[styles.tile, outOfStock && styles.tileDisabled]}
                >
                  <Text style={styles.tileTitle}>{price.milk_type_name} {price.pack_size_label}</Text>
                  <Text style={styles.tileMeta}>{outOfStock ? "Out of stock" : `KES ${price.amount}`}</Text>
                </TouchableOpacity>
              );
            })}
            {prices.length === 0 && (
              <Text style={styles.meta}>No prices set yet. Set prices on the Inventory page first.</Text>
            )}
          </View>
          <TouchableOpacity
            disabled={cartItems.length === 0}
            onPress={() => setStep("checkout")}
            style={[styles.button, cartItems.length === 0 && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Review cart ({cartCount})</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View>
          <TouchableOpacity onPress={() => setStep("products")}>
            <Text style={styles.backLink}>← Back to products</Text>
          </TouchableOpacity>

          {cartItems.map((it) => {
            const key = `${it.milk_type}-${it.pack_size}`;
            return (
              <View key={key} style={styles.cartRow}>
                <Text style={styles.cartItemName}>{it.name} {it.label}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => changeQuantity(key, -1)}>
                    <Text>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{it.quantity}</Text>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => changeQuantity(key, 1)}>
                    <Text>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.lineTotal}>{(it.amount * it.quantity).toFixed(2)}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>KES {total.toFixed(2)}</Text>
          </View>

          <Text style={styles.label}>Paper bags used</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={paperBags} onChangeText={setPaperBags} />

          <Text style={styles.label}>Payment method</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setPaymentMethod(m.key)}
                style={[styles.paymentTile, paymentMethod === m.key && styles.paymentTileActive]}
              >
                <Text style={paymentMethod === m.key ? styles.paymentTileTextActive : styles.paymentTileText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Confirm sale — KES {total.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb", padding: 16 },
  loadingText: { marginTop: 8, color: "#6b7280" },
  errorText: { color: "#dc2626", textAlign: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  meta: { fontSize: 12, color: "#6b7280" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, backgroundColor: "#fff", color: "#111827" },
  pickerWrap: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  tile: { width: "31%", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, backgroundColor: "#fff", alignItems: "center" },
  tileDisabled: { opacity: 0.5, backgroundColor: "#f3f4f6" },
  tileTitle: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  tileMeta: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  button: { backgroundColor: "#16a34a", borderRadius: 6, padding: 14, alignItems: "center", marginVertical: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  success: { backgroundColor: "#dcfce7", color: "#166534", padding: 10, borderRadius: 6, marginBottom: 12 },
  backLink: { color: "#6b7280", marginBottom: 8 },
  cartRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  cartItemName: { fontSize: 14, marginBottom: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperButton: { width: 28, height: 28, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, alignItems: "center", justifyContent: "center" },
  stepperValue: { width: 24, textAlign: "center" },
  lineTotal: { marginLeft: "auto", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#d1d5db" },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "600" },
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentTile: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, alignItems: "center", backgroundColor: "#fff" },
  paymentTileActive: { borderColor: "#16a34a", backgroundColor: "#dcfce7" },
  paymentTileText: { fontSize: 12, color: "#111827" },
  paymentTileTextActive: { fontSize: 12, color: "#166534", fontWeight: "600" },
});
