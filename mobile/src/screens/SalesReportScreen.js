import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, ActivityIndicator,
} from "react-native";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

function today() { return new Date().toISOString().slice(0, 10); }
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function SalesReportScreen() {
  const { colors } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/sales/orders/?page_size=200&created_at_after=${dateFrom}&created_at_before=${dateTo}T23:59:59`);
      setOrders(r.data.results || r.data);
    } catch { setOrders([]); }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (o.customer_name || "Walk-in").toLowerCase();
    return name.includes(q) || String(o.id).includes(q);
  });

  const grandTotal = filtered.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  return (
    <View style={s.root}>
      {/* Filters */}
      <View style={s.filterBar}>
        <View style={s.dateRow}>
          <View style={s.dateField}>
            <Text style={s.dateLabel}>From</Text>
            <TextInput style={s.dateInput} value={dateFrom}
              onChangeText={setDateFrom} placeholder="YYYY-MM-DD" />
          </View>
          <View style={s.dateField}>
            <Text style={s.dateLabel}>To</Text>
            <TextInput style={s.dateInput} value={dateTo}
              onChangeText={setDateTo} placeholder="YYYY-MM-DD" />
          </View>
          <TouchableOpacity style={[s.goBtn, { backgroundColor: colors.primary }]} onPress={load}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Go</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={s.search} placeholder="Search customer / order ID..."
          value={search} onChangeText={setSearch} />
      </View>

      {/* Summary bar */}
      <View style={[s.summaryBar, { borderLeftColor: colors.primary }]}>
        <Text style={s.summaryTxt}>{filtered.length} orders</Text>
        <Text style={[s.summaryTxt, { fontWeight: "700", color: colors.primary }]}>
          KES {grandTotal.toLocaleString()}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView horizontal>
          <View>
            {/* Table header */}
            <View style={[s.row, s.thead]}>
              <Text style={[s.cell, s.cId, s.thTxt]}>#</Text>
              <Text style={[s.cell, s.cCustomer, s.thTxt]}>Customer</Text>
              <Text style={[s.cell, s.cGoods, s.thTxt]}>Goods</Text>
              <Text style={[s.cell, s.cPayment, s.thTxt]}>Payment</Text>
              <Text style={[s.cell, s.cTotal, s.thTxt]}>Total (KES)</Text>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item: o, index }) => {
                const isPaid = o.payment_status === "PAID";
                const isCancelled = o.payment_status === "CANCELLED";
                const customerName = o.customer_name || (o.is_walk_in ? "Walk-in" : "—");
                const goods = (o.items || [])
                  .map((it) => `${it.quantity}× ${it.milk_type_name || ""}/${it.pack_size_label || ""}`)
                  .join(", ") || "—";
                return (
                  <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
                    <Text style={[s.cell, s.cId, s.bodyTxt, { color: "#9ca3af" }]}>{o.id}</Text>
                    <View style={[s.cell, s.cCustomer]}>
                      <Text style={[s.bodyTxt, { fontWeight: "600" }]}>{customerName}</Text>
                      <Text style={s.dateTxt}>{o.created_at?.slice(0, 10)}</Text>
                    </View>
                    <Text style={[s.cell, s.cGoods, s.bodyTxt]} numberOfLines={2}>{goods}</Text>
                    <View style={[s.cell, s.cPayment]}>
                      <View style={[s.badge, {
                        backgroundColor: isPaid ? "#dcfce7" : isCancelled ? "#f3f4f6" : "#fee2e2"
                      }]}>
                        <Text style={[s.badgeTxt, {
                          color: isPaid ? "#16a34a" : isCancelled ? "#6b7280" : "#dc2626"
                        }]}>
                          {isPaid ? "Paid" : isCancelled ? "Cancelled" : "Debt"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.cell, s.cTotal, s.bodyTxt, { fontWeight: "700" }]}>
                      {parseFloat(o.total_amount).toLocaleString()}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: "#9ca3af" }}>No sales found.</Text>
                </View>
              }
            />

            {filtered.length > 0 && (
              <View style={[s.row, s.totalRow]}>
                <Text style={[s.cell, { width: 36 + 130 + 160 + 90 }, s.totalLabel]}>Grand Total</Text>
                <Text style={[s.cell, s.cTotal, s.totalLabel, { color: colors.primary }]}>
                  {grandTotal.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  filterBar: { backgroundColor: "#fff", padding: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", gap: 8 },
  dateRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 10, color: "#9ca3af", marginBottom: 3 },
  dateInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, backgroundColor: "#f9fafb" },
  goBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  search: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, backgroundColor: "#f9fafb" },
  summaryBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderLeftWidth: 3, marginBottom: 2 },
  summaryTxt: { fontSize: 13, color: "#374151" },
  row: { flexDirection: "row", alignItems: "stretch" },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#f9fafb" },
  thead: { backgroundColor: "#4b5563" },
  thTxt: { color: "#fff", fontWeight: "700", fontSize: 11 },
  bodyTxt: { fontSize: 12, color: "#374151" },
  dateTxt: { fontSize: 10, color: "#9ca3af" },
  cell: { paddingHorizontal: 8, paddingVertical: 10, justifyContent: "center" },
  cId: { width: 36 },
  cCustomer: { width: 130 },
  cGoods: { width: 160 },
  cPayment: { width: 90 },
  cTotal: { width: 100 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  totalRow: { backgroundColor: "#f0fdf4", borderTopWidth: 2, borderTopColor: "#16a34a" },
  totalLabel: { fontWeight: "700", fontSize: 13, color: "#374151" },
});
