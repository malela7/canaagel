import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Switch } from "react-native";
import api from "../api/client";

export default function DeliveryScreen() {
  const [records, setRecords] = useState([]);

  const load = () => api.get("/delivery/daily-list/").then((r) => setRecords(r.data.results || r.data));

  useEffect(() => { load(); }, []);

  const toggleCompleted = async (record) => {
    await api.patch(`/delivery/records/${record.id}/`, { is_completed: !record.is_completed });
    load();
  };

  return (
    <FlatList
      style={styles.container}
      data={records}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={<Text style={styles.title}>Today's Deliveries</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No deliveries scheduled.</Text>}
      renderItem={({ item: r }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.customer?.name}</Text>
            <Text style={styles.meta}>{r.customer?.address}</Text>
            <Text style={styles.meta}>
              Debt: KES {r.customer?.debt_balance}
              {r.customer?.bottle_tracking ? ` · Bottles out: ${r.customer?.bottles_out}` : ""}
            </Text>
            {r.standing_items?.length > 0 && (
              <Text style={styles.meta}>
                {r.standing_items.map((it) => `${it.milk_type} ${it.pack_size} x${it.quantity}`).join(", ")}
              </Text>
            )}
          </View>
          <View style={styles.switchWrap}>
            <Text style={styles.meta}>Done</Text>
            <Switch value={r.is_completed} onValueChange={() => toggleCompleted(r)} />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "bold", padding: 16 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 20 },
  row: { backgroundColor: "#fff", padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 6, flexDirection: "row", alignItems: "center" },
  name: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#6b7280", fontSize: 13 },
  switchWrap: { alignItems: "center" },
});
