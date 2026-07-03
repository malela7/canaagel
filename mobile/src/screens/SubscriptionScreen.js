import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const STATUS_COLORS = {
  TRIAL: { bg: "#fef3c7", text: "#92400e", label: "Trial" },
  ACTIVE: { bg: "#dcfce7", text: "#166534", label: "Active" },
  SUSPENDED: { bg: "#fee2e2", text: "#b91c1c", label: "Suspended" },
  EXPIRED: { bg: "#f3f4f6", text: "#6b7280", label: "Expired" },
};

const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

export default function SubscriptionScreen() {
  const [shop, setShop] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [pollStatus, setPollStatus] = useState("");
  const pollRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.get("/shops/me/"),
        api.get("/shops/subscription-payments/"),
      ]);
      setShop(s.data);
      setPayments(p.data.results || p.data);
    } catch {
      Alert.alert("Error", "Failed to load subscription info.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPayment = async () => {
    if (!phone.match(/^2547\d{8}$/)) {
      Alert.alert("Invalid phone", "Enter a valid M-Pesa number: 2547XXXXXXXX");
      return;
    }
    setPaying(true);
    setPollStatus("Sending payment request…");
    try {
      await api.post("/shops/mpesa/stk-push/", { phone_number: phone });
      setPollStatus("Enter your M-Pesa PIN on your phone…");
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get("/shops/mpesa/stk-status/");
          const latest = (r.data.results || r.data)[0];
          if (latest && latest.status !== "PENDING") {
            clearInterval(pollRef.current);
            setPaying(false);
            if (latest.status === "SUCCESS") {
              setPollStatus("Payment successful!");
              load();
            } else {
              setPollStatus("Payment failed. Please try again.");
            }
          }
        } catch { /* keep polling */ }
      }, 4000);
    } catch (err) {
      setPaying(false);
      const msg = err.response?.data?.detail || "Could not send payment request.";
      setPollStatus(msg);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[shop?.status] || STATUS_COLORS.EXPIRED;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Subscription</Text>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.shopName}>{shop?.name}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>Trial ends: {fmt(shop?.trial_ends_at)}</Text>
        </View>
        {shop?.current_period_end && (
          <View style={styles.infoRow}>
            <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText}>Subscription end: {fmt(shop?.current_period_end)}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>Monthly fee: KES {shop?.monthly_fee || 0}</Text>
        </View>
      </View>

      <View style={styles.payCard}>
        <Text style={styles.sectionLabel}>PAY VIA M-PESA</Text>
        <Text style={styles.label}>M-Pesa phone number</Text>
        <TextInput
          style={styles.input}
          placeholder="2547XXXXXXXX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!paying}
        />
        {!!pollStatus && (
          <Text style={[styles.pollMsg, pollStatus.includes("success") ? { color: "#166534" } : pollStatus.includes("fail") ? { color: colors.danger } : {}]}>
            {pollStatus}
          </Text>
        )}
        <TouchableOpacity style={[styles.payBtn, paying && { opacity: 0.6 }]} onPress={startPayment} disabled={paying}>
          {paying
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnText}>Pay KES {shop?.monthly_fee || 0}</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>PAYMENT HISTORY</Text>
      {payments.length === 0 && <Text style={styles.empty}>No payments yet.</Text>}
      {payments.map((p) => (
        <View key={p.id} style={styles.paymentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentDate}>{fmt(p.paid_at)}</Text>
            <Text style={styles.paymentMeta}>{p.method}{p.mpesa_receipt_number ? ` · ${p.mpesa_receipt_number}` : ""}</Text>
          </View>
          <Text style={styles.paymentAmount}>KES {p.amount}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 14 },
  statusCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  shopName: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  payCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: "#fff", color: colors.text, marginBottom: 8 },
  pollMsg: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  payBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  paymentRow: { backgroundColor: "#fff", borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  paymentDate: { fontSize: 13, fontWeight: "600", color: colors.text },
  paymentMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  paymentAmount: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 8 },
});
