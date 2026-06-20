import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

export default function DeliveryScreen() {
  const [records, setRecords] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [tab, setTab] = useState("pending");

  const load = () => api.get("/delivery/daily-list/").then((r) => setRecords(r.data.results || r.data));
  const loadTransporters = () => api.get("/delivery/transporters/").then((r) => setTransporters(r.data.results || r.data));

  useEffect(() => { load(); loadTransporters(); }, []);

  const toggleCompleted = async (record) => {
    await api.patch(`/delivery/records/${record.id}/`, { is_completed: !record.is_completed });
    load();
  };

  const assignTransporter = async (record, transporterId) => {
    await api.patch(`/delivery/records/${record.id}/`, { transporter: transporterId || null });
    load();
  };

  const visibleRecords = useMemo(
    () => records.filter((r) => (tab === "completed" ? r.is_completed : !r.is_completed)),
    [records, tab]
  );

  return (
    <FlatList
      style={styles.container}
      data={visibleRecords}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Delivery</Text>
          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={[styles.tab, tab === t.key && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No deliveries in this view.</Text>}
      renderItem={({ item: r }) => (
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.name}>{r.customer?.name}</Text>
            {Number(r.customer?.debt_balance) > 0 && (
              <View style={styles.debtBadge}><Text style={styles.debtBadgeText}>KES {r.customer.debt_balance} owed</Text></View>
            )}
          </View>
          <Text style={styles.meta}>{r.customer?.address}</Text>
          {r.standing_items?.length > 0 && (
            <Text style={styles.meta}>
              {r.standing_items.map((it) => `${it.milk_type_name} ${it.pack_size_label} x${it.quantity}`).join(", ")}
            </Text>
          )}
          <Text style={styles.label}>Transporter</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={r.transporter || ""} onValueChange={(v) => assignTransporter(r, v)}>
              <Picker.Item label="Unassigned" value="" />
              {transporters.map((t) => <Picker.Item key={t.id} label={t.name} value={t.id} />)}
            </Picker>
          </View>
          <View style={styles.switchWrap}>
            <Text style={styles.meta}>Completed</Text>
            <Switch value={r.is_completed} onValueChange={() => toggleCompleted(r)} />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "bold", padding: 16, paddingBottom: 8 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  tabActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  tabText: { color: "#111827", fontSize: 13 },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 20 },
  row: { backgroundColor: "#fff", padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 6 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600", fontSize: 16 },
  debtBadge: { backgroundColor: "#fee2e2", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  debtBadgeText: { color: "#b91c1c", fontSize: 11 },
  meta: { color: "#6b7280", fontSize: 13 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8 },
  pickerWrap: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  switchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
});
