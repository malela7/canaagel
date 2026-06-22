import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

export default function SuperAdminHomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/reports/subscriptions/")
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const activeCount = data.shop_counts?.ACTIVE || 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Welcome back, Admin</Text>
      <Text style={styles.subGreeting}>Here's what's happening today</Text>

      <View style={styles.statGrid}>
        <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
          <Ionicons name="storefront-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.statValue}>{data.total_shops}</Text>
          <Text style={styles.statLabel}>Shop Owners</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#dcfce7" }]}>
          <Ionicons name="people-outline" size={20} color="#166534" />
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Plans</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
          <Ionicons name="cash-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.statValue}>KES {data.monthly_revenue}</Text>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#fee2e2" }]}>
          <Ionicons name="time-outline" size={20} color="#b91c1c" />
          <Text style={styles.statValue}>{data.expiring_soon}</Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate("Shops", { openForm: true })}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Register Shop</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Payments</Text>
      {(data.recent_payments || []).slice(0, 8).map((p, i) => (
        <View key={i} style={styles.activityRow}>
          <Text style={styles.activityShop}>{p.shop}</Text>
          <Text style={styles.activityMeta}>KES {p.amount} · {p.method}</Text>
        </View>
      ))}
      {(!data.recent_payments || data.recent_payments.length === 0) && (
        <Text style={styles.empty}>No payments yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  errorText: { color: colors.danger },
  greeting: { fontSize: 20, fontWeight: "bold", color: colors.text },
  subGreeting: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { width: "47%", borderRadius: 10, padding: 12 },
  statValue: { fontSize: 18, fontWeight: "bold", color: colors.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 8 },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  primaryAction: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  primaryActionText: { color: "#fff", fontWeight: "600" },
  activityRow: { backgroundColor: "#fff", borderRadius: 8, padding: 10, marginBottom: 6 },
  activityShop: { fontSize: 13, fontWeight: "600" },
  activityMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { color: colors.textSecondary, fontSize: 13 },
});
