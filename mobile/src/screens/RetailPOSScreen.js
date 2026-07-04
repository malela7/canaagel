import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
import { useTheme } from "../context/ThemeContext";
import api from "../api/client";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash", icon: "cash-outline" },
  { key: "MPESA", label: "M-Pesa", icon: "phone-portrait-outline" },
  { key: "BANK", label: "Bank", icon: "business-outline" },
  { key: "OTHER", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export default function RetailPOSScreen() {
  const { accent } = useTheme();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCat, setActiveCat] = useState(null); // null = All
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({}); // { productId: { ...product, qty } }

  const [cartModal, setCartModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const cartBounce = useRef(new Animated.Value(1)).current;

  const load = async () => {
    try {
      const [pRes, cRes, custRes] = await Promise.all([
        api.get("/retail/products/?active=1"),
        api.get("/retail/categories/"),
        api.get("/sales/customers/?page_size=200"),
      ]);
      setProducts(pRes.data.results ?? pRes.data);
      setCategories(cRes.data.results ?? cRes.data);
      setCustomers(custRes.data.results ?? custRes.data);
    } catch {
      Alert.alert("Error", "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + parseFloat(i.sell_price) * i.qty, 0);

  const bounce = () => {
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(cartBounce, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      if (parseFloat(product.quantity) <= 0) {
        Alert.alert("Out of stock", `${product.name} is out of stock.`);
        return prev;
      }
      return {
        ...prev,
        [product.id]: {
          ...product,
          qty: (existing?.qty || 0) + 1,
        },
      };
    });
    bounce();
  };

  const changeQty = (productId, delta) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const qty = item.qty + delta;
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...item, qty } };
    });
  };

  const clearCart = () => setCart({});

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setPlacingOrder(true);
    try {
      const { data } = await api.post("/retail/orders/", {
        supplier_name: "",
        notes: selectedCustomer ? `Customer: ${selectedCustomer.name}` : "",
        items: cartItems.map((i) => ({
          product: i.id,
          quantity: i.qty,
          unit_cost: i.sell_price,
        })),
      });
      setSuccessMsg(`Order #${data.id} placed! Total: KES ${cartTotal.toFixed(2)}`);
      clearCart();
      setSelectedCustomer(null);
      setPaymentMethod("CASH");
      setCartModal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || "Could not place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCat === null || String(p.category) === String(activeCat);
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredCustomers = customers.filter((c) =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const s = styles(accent);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={s.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Place Order</Text>
          <Text style={s.headerSub}>{products.length} products available</Text>
        </View>
        <TouchableOpacity onPress={() => setCartModal(true)} style={s.cartBtn}>
          <Ionicons name="cart" size={24} color="#fff" />
          {cartCount > 0 && (
            <Animated.View style={[s.cartBadge, { transform: [{ scale: cartBounce }] }]}>
              <Text style={s.cartBadgeText}>{cartCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {successMsg ? (
        <View style={s.successBar}>
          <Ionicons name="checkmark-circle" size={16} color="#166534" />
          <Text style={s.successText}>{successMsg}</Text>
        </View>
      ) : null}

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity
          style={[s.catTab, activeCat === null && { backgroundColor: accent, borderColor: accent }]}
          onPress={() => setActiveCat(null)}
        >
          <Text style={[s.catTabText, activeCat === null && { color: "#fff", fontWeight: "700" }]}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[s.catTab, activeCat === c.id && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => setActiveCat(activeCat === c.id ? null : c.id)}
          >
            <Text style={[s.catTabText, activeCat === c.id && { color: "#fff", fontWeight: "700" }]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const inCart = cart[item.id];
          const outOfStock = parseFloat(item.quantity) <= 0;
          const cardW = (SCREEN_W - 24 - 10) / 2;
          return (
            <TouchableOpacity
              style={[s.card, { width: cardW }, outOfStock && s.cardOut]}
              onPress={() => !outOfStock && addToCart(item)}
              activeOpacity={0.85}
            >
              {/* Image placeholder */}
              <View style={[s.cardImageBox, outOfStock && { backgroundColor: "#e5e7eb" }]}>
                <Ionicons name="camera-outline" size={30} color={outOfStock ? "#9ca3af" : "#d1d5db"} />
              </View>
              {/* Cart badge */}
              {inCart && (
                <View style={[s.cardBadge, { backgroundColor: accent }]}>
                  <Text style={s.cardBadgeText}>{inCart.qty}</Text>
                </View>
              )}
              {/* Name + category */}
              <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
              {item.category_name ? <Text style={s.cardCat}>{item.category_name}</Text> : null}
              {/* Price + add button */}
              <View style={s.cardFooter}>
                <View style={[s.priceBadge, outOfStock && s.priceBadgeOut]}>
                  <Text style={[s.priceText, outOfStock && { color: "#9ca3af" }]}>
                    {outOfStock ? "Out of stock" : `KES ${parseFloat(item.sell_price).toFixed(0)}`}
                  </Text>
                </View>
                {!outOfStock && (
                  <TouchableOpacity
                    style={[s.addBtn, { backgroundColor: accent }]}
                    onPress={() => addToCart(item)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color="#9ca3af" />
            <Text style={s.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Floating checkout button */}
      {cartCount > 0 && (
        <TouchableOpacity style={[s.floatingCart, { backgroundColor: accent }]} onPress={() => setCartModal(true)}>
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={s.floatingCartText}>{cartCount} item{cartCount > 1 ? "s" : ""} · KES {cartTotal.toFixed(2)}</Text>
          <Ionicons name="chevron-up" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={cartModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.cartSheet}>
            <View style={s.cartSheetHeader}>
              <Text style={s.cartSheetTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setCartModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Customer (optional) */}
              <Text style={s.sectionLabel}>Customer (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="Search customer or leave empty for walk-in"
                placeholderTextColor="#9ca3af"
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChangeText={(v) => { setCustomerSearch(v); setSelectedCustomer(null); }}
              />
              {customerSearch && !selectedCustomer && (
                <View style={s.customerDropdown}>
                  {filteredCustomers.slice(0, 5).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={s.customerItem}
                      onPress={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                    >
                      <Text style={s.customerName}>{c.name}</Text>
                      {c.phone_number ? <Text style={s.customerPhone}>{c.phone_number}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedCustomer && (
                <TouchableOpacity style={s.selectedCustomer} onPress={() => setSelectedCustomer(null)}>
                  <Ionicons name="person-circle-outline" size={18} color={accent} />
                  <Text style={[s.selectedCustomerName, { color: accent }]}>{selectedCustomer.name}</Text>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}

              {/* Cart items */}
              <Text style={s.sectionLabel}>Items</Text>
              {cartItems.length === 0 ? (
                <Text style={s.emptyCartText}>No items in cart</Text>
              ) : cartItems.map((item) => (
                <View key={item.id} style={s.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartItemName}>{item.name}</Text>
                    <Text style={s.cartItemPrice}>KES {parseFloat(item.sell_price).toFixed(2)} each</Text>
                  </View>
                  <View style={s.stepper}>
                    <TouchableOpacity style={s.stepBtn} onPress={() => changeQty(item.id, -1)}>
                      <Ionicons name="remove" size={16} color="#374151" />
                    </TouchableOpacity>
                    <Text style={s.stepVal}>{item.qty}</Text>
                    <TouchableOpacity style={s.stepBtn} onPress={() => changeQty(item.id, 1)}>
                      <Ionicons name="add" size={16} color="#374151" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.lineTotal}>KES {(parseFloat(item.sell_price) * item.qty).toFixed(2)}</Text>
                </View>
              ))}

              {/* Total */}
              {cartItems.length > 0 && (
                <View style={[s.totalRow, { borderColor: accent + "33" }]}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={[s.totalValue, { color: accent }]}>KES {cartTotal.toFixed(2)}</Text>
                </View>
              )}

              {/* Payment method */}
              <Text style={s.sectionLabel}>Payment Method</Text>
              <View style={s.paymentGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[s.paymentTile, paymentMethod === m.key && { borderColor: accent, backgroundColor: accent + "15" }]}
                    onPress={() => setPaymentMethod(m.key)}
                  >
                    <Ionicons name={m.icon} size={20} color={paymentMethod === m.key ? accent : "#6b7280"} />
                    <Text style={[s.paymentLabel, paymentMethod === m.key && { color: accent, fontWeight: "700" }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.checkoutActions}>
                <TouchableOpacity style={s.clearBtn} onPress={() => { clearCart(); setCartModal(false); }}>
                  <Text style={s.clearBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.checkoutBtn, { backgroundColor: accent }, cartItems.length === 0 && { opacity: 0.5 }]}
                  onPress={handleCheckout}
                  disabled={placingOrder || cartItems.length === 0}
                >
                  {placingOrder
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.checkoutBtnText}>Confirm · KES {cartTotal.toFixed(2)}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (accent) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 8, color: "#6b7280" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
    headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
    cartBtn: { backgroundColor: accent, borderRadius: 12, padding: 10, position: "relative" },
    cartBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    cartBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    successBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#dcfce7", paddingHorizontal: 16, paddingVertical: 10 },
    successText: { color: "#166534", fontSize: 13, fontWeight: "600", flex: 1 },
    searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    searchInput: { flex: 1, fontSize: 14, color: "#111827" },
    catScroll: { marginTop: 10, marginBottom: 4, flexGrow: 0 },
    catTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
    catTabText: { fontSize: 13, color: "#374151" },
    card: { backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", position: "relative", overflow: "hidden" },
    cardOut: { opacity: 0.6 },
    cardImageBox: { height: 90, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 8 },
    cardBadge: { position: "absolute", top: 6, right: 6, borderRadius: 12, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    cardBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    cardName: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 2 },
    cardCat: { fontSize: 11, color: "#9ca3af", marginBottom: 6 },
    cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    priceBadge: { backgroundColor: "#dcfce7", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
    priceBadgeOut: { backgroundColor: "#f3f4f6" },
    priceText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
    addBtn: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: "#9ca3af", marginTop: 8, fontSize: 15 },
    floatingCart: { position: "absolute", bottom: 20, left: 20, right: 20, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
    floatingCartText: { color: "#fff", fontWeight: "700", fontSize: 15, flex: 1, textAlign: "center" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    cartSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
    cartSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    cartSheetTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
    sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb" },
    customerDropdown: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, marginTop: 4, overflow: "hidden" },
    customerItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    customerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    customerPhone: { fontSize: 12, color: "#6b7280" },
    selectedCustomer: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: accent + "15", borderRadius: 8, padding: 10, marginTop: 6 },
    selectedCustomerName: { fontSize: 14, fontWeight: "600", flex: 1 },
    emptyCartText: { color: "#9ca3af", fontSize: 14, textAlign: "center", paddingVertical: 20 },
    cartItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 },
    cartItemName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    cartItemPrice: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 2 },
    stepBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
    stepVal: { width: 28, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#111827" },
    lineTotal: { fontSize: 14, fontWeight: "700", color: "#111827", minWidth: 70, textAlign: "right" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, marginTop: 8, borderTopWidth: 2, borderBottomWidth: 2 },
    totalLabel: { fontSize: 17, fontWeight: "700", color: "#111827" },
    totalValue: { fontSize: 20, fontWeight: "900" },
    paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    paymentTile: { flex: 1, minWidth: "40%", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
    paymentLabel: { fontSize: 13, color: "#374151" },
    checkoutActions: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 8 },
    clearBtn: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    clearBtnText: { color: "#6b7280", fontWeight: "600", fontSize: 15 },
    checkoutBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    checkoutBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  });
