import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api/client";

export default function RetailHomeScreen({ navigation }) {
  const { accent } = useTheme();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [stats, setStats] = useState({ today_orders: 0, today_revenue: 0, total_products: 0, low_stock: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get("/retail/orders/?page_size=50"),
        api.get("/retail/products/?active=1"),
      ]);
      const allOrders = ordersRes.data.results ?? ordersRes.data;
      const allProducts = productsRes.data.results ?? productsRes.data;
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = allOrders.filter((o) => o.ordered_at?.startsWith(today));
      const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);
      setStats({
        today_orders: todayOrders.length,
        today_revenue: todayRevenue,
        total_products: allProducts.length,
        low_stock: allProducts.filter((p) => p.is_low).length,
      });
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  // All feature tiles. navigate() goes to RetailInnerStack screens.
  const go = (screen) => navigation.navigate(screen);
  const switchTab = (tab) => navigation.getParent()?.navigate(tab);

  const tileGroups = [
    {
      label: "Orders",
      tiles: [
        { label: "Place Order", icon: "cart-outline", color: "#3b82f6", bg: "#eff6ff", onPress: () => switchTab("PlaceOrder") },
        { label: "Dashboard", icon: "bar-chart-outline", color: "#06b6d4", bg: "#ecfeff", onPress: () => switchTab("Dashboard") },
      ],
    },
    {
      label: "Catalog",
      tiles: [
        { label: "Products", icon: "cube-outline", color: "#10b981", bg: "#ecfdf5", onPress: () => go("Products") },
        { label: "Stock Orders", icon: "file-tray-full-outline", color: "#ef4444", bg: "#fef2f2", onPress: () => go("StockOrders") },
      ],
    },
    {
      label: "Business",
      tiles: [
        { label: "Customers", icon: "people-outline", color: "#8b5cf6", bg: "#f5f3ff", onPress: () => go("Customers") },
        { label: "Expenses", icon: "receipt-outline", color: "#f59e0b", bg: "#fffbeb", onPress: () => go("Expenses") },
        ...(isOwner ? [
          { label: "Employees", icon: "person-add-outline", color: "#ec4899", bg: "#fdf2f8", onPress: () => go("Employees") },
          { label: "Subscription", icon: "card-outline", color: "#6366f1", bg: "#eef2ff", onPress: () => go("Subscription") },
        ] : []),
      ],
    },
  ];

  const s = styles(accent);

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      {/* Greeting banner */}
      <View style={[s.banner, { backgroundColor: accent }]}>
        <View>
          <Text style={s.bannerHello}>Hello, {user?.first_name || user?.username} 👋</Text>
          <Text style={s.bannerDate}>{new Date().toDateString()}</Text>
        </View>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>
            {(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stat cards */}
      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} color={accent} />
      ) : (
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderColor: accent + "33" }]}>
            <Ionicons name="receipt-outline" size={18} color={accent} />
            <Text style={[s.statNum, { color: accent }]}>{stats.today_orders}</Text>
            <Text style={s.statLabel}>Today's Orders</Text>
          </View>
          <View style={[s.statCard, { borderColor: "#10b98133" }]}>
            <Ionicons name="cash-outline" size={18} color="#10b981" />
            <Text style={[s.statNum, { color: "#10b981" }]}>KES {stats.today_revenue.toFixed(0)}</Text>
            <Text style={s.statLabel}>Revenue Today</Text>
          </View>
          <View style={[s.statCard, { borderColor: stats.low_stock > 0 ? "#f59e0b33" : "#e5e7eb" }]}>
            <Ionicons name="warning-outline" size={18} color={stats.low_stock > 0 ? "#f59e0b" : "#9ca3af"} />
            <Text style={[s.statNum, { color: stats.low_stock > 0 ? "#f59e0b" : "#111827" }]}>{stats.low_stock}</Text>
            <Text style={s.statLabel}>Low Stock</Text>
          </View>
        </View>
      )}

      {/* Grouped feature sections */}
      {tileGroups.map((group) => (
        <View key={group.label}>
          <Text style={s.groupLabel}>{group.label}</Text>
          <View style={s.grid}>
            {group.tiles.map((tile) => (
              <TouchableOpacity
                key={tile.label}
                style={[s.tile, { backgroundColor: tile.bg, borderColor: tile.color + "33" }]}
                onPress={tile.onPress}
                activeOpacity={0.75}
              >
                <View style={[s.tileIconWrap, { backgroundColor: tile.color + "20" }]}>
                  <Ionicons name={tile.icon} size={28} color={tile.color} />
                </View>
                <Text style={[s.tileLabel, { color: tile.color }]}>{tile.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = (accent) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    banner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    bannerHello: { fontSize: 20, fontWeight: "800", color: "#fff" },
    bannerDate: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 3 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
    statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, gap: 8 },
    statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1.5 },
    statNum: { fontSize: 16, fontWeight: "900", marginTop: 4 },
    statLabel: { fontSize: 10, color: "#6b7280", marginTop: 2, textAlign: "center" },
    groupLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 18, marginBottom: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
    tile: { width: "47%", borderRadius: 14, padding: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center", minHeight: 110 },
    tileIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    tileLabel: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  });
