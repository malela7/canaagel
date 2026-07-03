import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ today_orders: 0, today_revenue: 0, total_products: 0, low_stock: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get("/retail/orders/?page_size=10"),
        api.get("/retail/products/?active=1"),
      ]);
      const allOrders = ordersRes.data.results ?? ordersRes.data;
      const allProducts = productsRes.data.results ?? productsRes.data;
      setOrders(allOrders);

      const today = new Date().toISOString().split("T")[0];
      const todayOrders = allOrders.filter((o) => o.ordered_at?.startsWith(today));
      const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);
      const lowStock = allProducts.filter((p) => p.is_low).length;

      setStats({
        today_orders: todayOrders.length,
        today_revenue: todayRevenue,
        total_products: allProducts.length,
        low_stock: lowStock,
      });
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const statusColor = (s) => ({ PENDING: "#f59e0b", RECEIVED: "#22c55e", CANCELLED: "#ef4444" }[s] || "#6b7280");

  const s = styles(accent);

  return (
    <FlatList
      data={orders}
      keyExtractor={(i) => String(i.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <>
          {/* Greeting */}
          <View style={s.greeting}>
            <View>
              <Text style={s.greetingHello}>Hello, {user?.first_name || user?.username} 👋</Text>
              <Text style={s.greetingDate}>{new Date().toDateString()}</Text>
            </View>
            <View style={[s.avatarCircle, { backgroundColor: accent }]}>
              <Text style={s.avatarText}>{(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}</Text>
            </View>
          </View>

          {/* Stats cards */}
          {loading ? (
            <ActivityIndicator style={{ margin: 20 }} color={accent} />
          ) : (
            <View style={s.statsGrid}>
              <View style={[s.statCard, { backgroundColor: accent }]}>
                <Ionicons name="receipt-outline" size={22} color="rgba(255,255,255,0.8)" />
                <Text style={s.statValue}>{stats.today_orders}</Text>
                <Text style={s.statLabel}>Today's Orders</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#fff" }]}>
                <Ionicons name="cash-outline" size={22} color={accent} />
                <Text style={[s.statValue, { color: "#111827" }]}>KES {stats.today_revenue.toFixed(0)}</Text>
                <Text style={[s.statLabel, { color: "#6b7280" }]}>Today's Revenue</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#fff" }]}>
                <Ionicons name="cube-outline" size={22} color={accent} />
                <Text style={[s.statValue, { color: "#111827" }]}>{stats.total_products}</Text>
                <Text style={[s.statLabel, { color: "#6b7280" }]}>Products</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: stats.low_stock > 0 ? "#fef3c7" : "#fff" }]}>
                <Ionicons name="warning-outline" size={22} color={stats.low_stock > 0 ? "#d97706" : "#9ca3af"} />
                <Text style={[s.statValue, { color: stats.low_stock > 0 ? "#d97706" : "#111827" }]}>{stats.low_stock}</Text>
                <Text style={[s.statLabel, { color: stats.low_stock > 0 ? "#d97706" : "#6b7280" }]}>Low Stock</Text>
              </View>
            </View>
          )}

          <Text style={s.sectionTitle}>Recent Orders</Text>
        </>
      }
      renderItem={({ item }) => (
        <View style={s.orderCard}>
          <View style={s.orderTop}>
            <View>
              <Text style={s.orderId}>Order #{item.id}</Text>
              {item.supplier_name ? <Text style={s.orderSub}>{item.supplier_name}</Text> : null}
              {item.notes ? <Text style={s.orderNote}>{item.notes}</Text> : null}
            </View>
            <View>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[s.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
              <Text style={s.orderTotal}>KES {parseFloat(item.total_cost).toFixed(2)}</Text>
            </View>
          </View>
          <Text style={s.orderDate}>{new Date(item.ordered_at).toLocaleString()}</Text>
        </View>
      )}
      ListEmptyComponent={
        !loading && (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text style={s.emptyText}>No orders yet today</Text>
          </View>
        )
      }
    />
  );
}

const styles = (accent) =>
  StyleSheet.create({
    greeting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 10 },
    greetingHello: { fontSize: 20, fontWeight: "800", color: "#111827" },
    greetingDate: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
    avatarCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
    statCard: { flex: 1, minWidth: "44%", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#f3f4f6" },
    statValue: { fontSize: 22, fontWeight: "900", color: "#fff", marginTop: 6 },
    statLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    orderCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
    orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    orderId: { fontSize: 14, fontWeight: "700", color: "#111827" },
    orderSub: { fontSize: 12, color: "#6b7280" },
    orderNote: { fontSize: 12, color: "#6b7280", fontStyle: "italic" },
    orderTotal: { fontSize: 14, fontWeight: "700", color: "#111827", textAlign: "right", marginTop: 4 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-end" },
    badgeText: { fontSize: 11, fontWeight: "600" },
    orderDate: { fontSize: 11, color: "#9ca3af", marginTop: 8 },
    empty: { alignItems: "center", paddingTop: 40 },
    emptyText: { color: "#9ca3af", marginTop: 8, fontSize: 14 },
  });
