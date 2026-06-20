import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import api from "../api/client";

const REPORTS = [
  { key: "sales", label: "Sales" },
  { key: "debt", label: "Debt" },
  { key: "paper-bags", label: "Paper Bags" },
  { key: "suppliers", label: "Suppliers" },
  { key: "bottles", label: "Bottles" },
];

function StatRow({ items }) {
  return (
    <View style={styles.statRow}>
      {items.map(({ label, value }) => (
        <View key={label} style={styles.statBox}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ListRows({ rows, render }) {
  if (!rows.length) {
    return <Text style={styles.empty}>No records for this range.</Text>;
  }
  return rows.map((row, i) => (
    <View key={i} style={styles.row}>
      {render(row)}
    </View>
  ));
}

function SalesReport({ data }) {
  return (
    <>
      <StatRow items={[
        { label: "Total Sales", value: data.total_sales },
        { label: "Orders", value: data.order_count },
      ]} />
      <ListRows rows={data.by_item} render={(r) => (
        <>
          <Text style={styles.rowTitle}>{r.milk_type__name} {r.pack_size__label}</Text>
          <Text style={styles.rowMeta}>Qty {r.total_quantity} · KES {r.total_revenue}</Text>
        </>
      )} />
    </>
  );
}

function DebtReport({ data }) {
  return (
    <>
      <StatRow items={[{ label: "Total Debt", value: data.total_debt }]} />
      <ListRows rows={data.customers} render={(c) => (
        <>
          <Text style={styles.rowTitle}>{c.name}</Text>
          <Text style={styles.rowMeta}>{c.phone_number} · KES {c.debt_balance}</Text>
        </>
      )} />
    </>
  );
}

function PaperBagsReport({ data }) {
  return (
    <>
      <StatRow items={[
        { label: "Bought", value: data.bought },
        { label: "Used", value: data.used },
      ]} />
      <ListRows rows={data.remaining} render={(r) => (
        <>
          <Text style={styles.rowTitle}>{r.label}</Text>
          <Text style={styles.rowMeta}>{r.quantity} remaining{r.is_low ? " · LOW" : ""}</Text>
        </>
      )} />
    </>
  );
}

function SuppliersReport({ data }) {
  return (
    <>
      <StatRow items={[{ label: "Total Cost", value: data.total_cost }]} />
      <ListRows rows={data.by_supplier} render={(r) => (
        <>
          <Text style={styles.rowTitle}>{r.supplier__name} ({r.kind})</Text>
          <Text style={styles.rowMeta}>Qty {r.total_quantity} · KES {r.total_cost}</Text>
        </>
      )} />
    </>
  );
}

function BottlesReport({ data }) {
  return (
    <>
      <StatRow items={[{ label: "Total Bottles Out", value: data.total_bottles_out }]} />
      <ListRows rows={data.customers} render={(c) => (
        <>
          <Text style={styles.rowTitle}>{c.name}</Text>
          <Text style={styles.rowMeta}>{c.bottles_out} bottles out</Text>
        </>
      )} />
    </>
  );
}

const REPORT_VIEWS = {
  sales: SalesReport,
  debt: DebtReport,
  "paper-bags": PaperBagsReport,
  suppliers: SuppliersReport,
  bottles: BottlesReport,
};

export default function ReportsScreen() {
  const [active, setActive] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (key) => {
    setActive(key);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/reports/${key}/`);
      setData(data);
    } catch (e) {
      setError("Failed to load report. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const ReportView = REPORT_VIEWS[active];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.buttonRow}>
        {REPORTS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.tab, active === r.key && styles.tabActive]}
            onPress={() => load(r.key)}
          >
            <Text style={[styles.tabText, active === r.key && styles.tabTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.resultBox}>
        {loading && <ActivityIndicator color="#16a34a" />}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && data && ReportView && <ReportView data={data} />}
        {!loading && !error && !data && <Text style={styles.empty}>Select a report above.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  tabActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  tabText: { color: "#111827" },
  tabTextActive: { color: "#fff" },
  resultBox: { backgroundColor: "#fff", borderRadius: 6, padding: 12 },
  empty: { color: "#6b7280", fontSize: 13 },
  errorText: { color: "#dc2626", fontSize: 13 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statBox: { backgroundColor: "#f3f4f6", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  statLabel: { fontSize: 11, color: "#6b7280" },
  statValue: { fontSize: 16, fontWeight: "600" },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowTitle: { fontSize: 14, fontWeight: "500" },
  rowMeta: { fontSize: 12, color: "#6b7280" },
});
