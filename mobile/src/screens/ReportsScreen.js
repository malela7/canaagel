import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import api from "../api/client";

const REPORTS = [
  { key: "sales", label: "Sales" },
  { key: "debt", label: "Debt" },
  { key: "paper-bags", label: "Paper Bags" },
  { key: "suppliers", label: "Suppliers" },
  { key: "bottles", label: "Bottles" },
];

export default function ReportsScreen() {
  const [active, setActive] = useState(null);
  const [data, setData] = useState(null);

  const load = async (key) => {
    setActive(key);
    const { data } = await api.get(`/reports/${key}/`);
    setData(data);
  };

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
        <Text style={styles.mono}>{data ? JSON.stringify(data, null, 2) : "Select a report above."}</Text>
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
  mono: { fontFamily: "monospace", fontSize: 12 },
});
