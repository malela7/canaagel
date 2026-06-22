import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import api from "../api/client";
import { colors } from "../theme";

export default function SuperAdminReportsScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/reports/subscriptions/")
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load report."));
  }, []);

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }
  if (!data) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const statusEntries = Object.entries(data.shop_counts || {});

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscriptions Overview</Text>

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Shops</Text>
          <Text style={styles.statValue}>{data.total_shops}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
          <Text style={styles.statValue}>KES {data.monthly_revenue}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Expiring Soon</Text>
          <Text style={styles.statValue}>{data.expiring_soon}</Text>
        </View>
        {statusEntries.map(([status, count]) => (
          <View key={status} style={styles.statCard}>
            <Text style={styles.statLabel}>{status}</Text>
            <Text style={styles.statValue}>{count}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Payments</Text>
      {(data.recent_payments || []).map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.rowTitle}>{p.shop}</Text>
          <Text style={styles.rowMeta}>KES {p.amount} · {p.method} · {p.paid_at}</Text>
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
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statCard: { backgroundColor: "#fff", borderRadius: 8, padding: 10, minWidth: "30%" },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  row: { backgroundColor: "#fff", borderRadius: 6, padding: 10, marginBottom: 6 },
  rowTitle: { fontSize: 13, fontWeight: "600" },
  rowMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  empty: { color: colors.textSecondary, fontSize: 13 },
});
