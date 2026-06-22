import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const PLAN_TABS = [
  { key: "ALL", label: "All Plans" },
  { key: "TRIAL", label: "Trial (Free)" },
  { key: "BASIC", label: "Basic" },
  { key: "STANDARD", label: "Standard" },
  { key: "PREMIUM", label: "Premium" },
];

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "TRIAL", label: "Trial" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "EXPIRED", label: "Expired" },
];

const PLAN_PRICES = { TRIAL: 0, BASIC: 999, STANDARD: 1999, PREMIUM: 2999 };

const STATUS_BADGE = {
  ACTIVE: { bg: "#dcfce7", text: "#166534" },
  TRIAL: { bg: "#fef3c7", text: "#92400e" },
  SUSPENDED: { bg: "#fee2e2", text: "#b91c1c" },
  EXPIRED: { bg: "#f3f4f6", text: "#6b7280" },
};

const PLAN_BADGE = {
  TRIAL: { bg: "#f3f4f6", text: "#6b7280" },
  BASIC: { bg: "#dbeafe", text: "#1d4ed8" },
  STANDARD: { bg: "#fef3c7", text: "#92400e" },
  PREMIUM: { bg: "#ede9fe", text: "#6d28d9" },
};

const emptyForm = {
  shop_name: "", shop_phone_number: "", shop_address: "",
  owner_first_name: "", owner_last_name: "", owner_email: "", owner_phone_number: "",
  owner_username: "", owner_password: "",
  plan: "TRIAL", custom_price: false, monthly_fee: "",
};

export default function ShopsScreen({ route }) {
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [planTab, setPlanTab] = useState("ALL");
  const [statusTab, setStatusTab] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(!!route?.params?.openForm);
  const [errors, setErrors] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});

  const load = () => api.get("/shops/").then((r) => setShops(r.data.results || r.data));

  useEffect(() => { load(); }, []);
  useEffect(() => { if (route?.params?.openForm) setShowForm(true); }, [route?.params?.openForm]);

  const visibleShops = useMemo(() => {
    return shops.filter((s) => {
      if (planTab !== "ALL" && s.plan !== planTab) return false;
      if (statusTab !== "ALL" && s.status !== statusTab) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.owner_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [shops, planTab, statusTab, search]);

  const handlePlanSelect = (plan) => {
    setForm((f) => ({ ...f, plan, custom_price: false, monthly_fee: String(PLAN_PRICES[plan] || "") }));
  };

  const handleCreate = async () => {
    setErrors([]);
    try {
      const monthly_fee = form.custom_price ? form.monthly_fee : (PLAN_PRICES[form.plan] ?? 0);
      await api.post("/shops/", { ...form, monthly_fee });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const messages = [];
        Object.entries(data).forEach(([key, val]) => {
          messages.push(`${key}: ${Array.isArray(val) ? val.join(" ") : val}`);
        });
        setErrors(messages.length ? messages : ["Could not register shop."]);
      } else {
        setErrors(["Could not register shop."]);
      }
    }
  };

  const suspend = (id, name) => {
    Alert.alert("Suspend shop?", `${name} will lose access until reactivated.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Suspend", style: "destructive", onPress: async () => { await api.post(`/shops/${id}/suspend/`); load(); } },
    ]);
  };
  const activate = async (id) => { await api.post(`/shops/${id}/activate/`); load(); };
  const extendTrial = async (id) => { await api.post(`/shops/${id}/extend-trial/`); load(); };
  const recordPayment = async (id) => {
    const amount = paymentAmounts[id];
    if (!amount) return;
    await api.post(`/shops/${id}/record-payment/`, { amount, method: "CASH" });
    setPaymentAmounts((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Shop Owners</Text>
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search shops or owners..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {PLAN_TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setPlanTab(t.key)}
            style={[styles.planChip, planTab === t.key && styles.planChipActive]}>
            <Text style={[styles.planChipText, planTab === t.key && styles.planChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setStatusTab(t.key)}
            style={[styles.statusChip, statusTab === t.key && styles.statusChipActive]}>
            <Text style={[styles.statusChipText, statusTab === t.key && styles.statusChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        style={{ flex: 1 }}
        data={visibleShops}
        keyExtractor={(s) => String(s.id)}
        ListEmptyComponent={<Text style={styles.empty}>No shops match this view.</Text>}
        renderItem={({ item: s }) => {
          const statusColors = STATUS_BADGE[s.status] || STATUS_BADGE.EXPIRED;
          const planColors = PLAN_BADGE[s.plan] || PLAN_BADGE.TRIAL;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.shopName}>{s.name}</Text>
                <View style={[styles.badge, { backgroundColor: planColors.bg }]}>
                  <Text style={[styles.badgeText, { color: planColors.text }]}>{s.plan}</Text>
                </View>
              </View>
              {!!s.owner_name && <Text style={styles.ownerName}>{s.owner_name}</Text>}
              {!!s.address && <Text style={styles.meta}><Ionicons name="location-outline" size={12} /> {s.address}</Text>}
              {!!s.owner_phone_number && <Text style={styles.meta}><Ionicons name="call-outline" size={12} /> {s.owner_phone_number}</Text>}
              <Text style={styles.meta}>Trial ends: {s.trial_ends_at ? s.trial_ends_at.slice(0, 10) : "—"}</Text>

              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLabel}>Sales</Text>
                  <Text style={styles.statValue}>KES {s.total_sales}</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Customers</Text>
                  <Text style={styles.statValue}>{s.customer_count}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.badgeText, { color: statusColors.text }]}>{s.status}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionGray} onPress={() => extendTrial(s.id)}>
                  <Text style={styles.actionGrayText}>Extend</Text>
                </TouchableOpacity>
                {s.status === "SUSPENDED" || s.status === "EXPIRED" ? (
                  <TouchableOpacity style={styles.actionGreen} onPress={() => activate(s.id)}>
                    <Text style={styles.actionGreenText}>Activate</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.actionRed} onPress={() => suspend(s.id, s.name)}>
                    <Text style={styles.actionRedText}>Suspend</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.paymentRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Amount paid"
                  keyboardType="numeric"
                  value={paymentAmounts[s.id] || ""}
                  onChangeText={(v) => setPaymentAmounts((prev) => ({ ...prev, [s.id]: v }))}
                />
                <TouchableOpacity style={styles.actionGray} onPress={() => recordPayment(s.id)}>
                  <Text style={styles.actionGrayText}>Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <ScrollView style={styles.formContainer} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Register Shop</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {errors.map((e, i) => <Text key={i} style={styles.fieldError}>{e}</Text>)}

          <Text style={styles.sectionLabel}>SHOP DETAILS</Text>
          <Text style={styles.label}>Shop name</Text>
          <TextInput style={styles.input} placeholder="e.g. Jey Milk Shop" value={form.shop_name} onChangeText={(v) => setForm({ ...form, shop_name: v })} />
          <Text style={styles.label}>Phone number</Text>
          <TextInput style={styles.input} placeholder="2547XXXXXXXX" value={form.shop_phone_number} onChangeText={(v) => setForm({ ...form, shop_phone_number: v })} />
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} placeholder="e.g. 12 MG Road" value={form.shop_address} onChangeText={(v) => setForm({ ...form, shop_address: v })} />

          <Text style={styles.sectionLabel}>OWNER DETAILS</Text>
          <Text style={styles.label}>Owner name</Text>
          <TextInput style={styles.input} placeholder="Full name" value={form.owner_first_name} onChangeText={(v) => setForm({ ...form, owner_first_name: v })} />
          <Text style={styles.label}>Last name</Text>
          <TextInput style={styles.input} placeholder="Last name" value={form.owner_last_name} onChangeText={(v) => setForm({ ...form, owner_last_name: v })} />
          <Text style={styles.label}>Phone number</Text>
          <TextInput style={styles.input} placeholder="+91 98765 43210" value={form.owner_phone_number} onChangeText={(v) => setForm({ ...form, owner_phone_number: v })} />
          <Text style={styles.label}>Email address</Text>
          <TextInput style={styles.input} placeholder="owner@email.com" value={form.owner_email} onChangeText={(v) => setForm({ ...form, owner_email: v })} />
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholder="e.g. jabir_owner" autoCapitalize="none" value={form.owner_username} onChangeText={(v) => setForm({ ...form, owner_username: v })} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Set a password" secureTextEntry value={form.owner_password} onChangeText={(v) => setForm({ ...form, owner_password: v })} />

          <Text style={styles.sectionLabel}>SUBSCRIPTION PLAN</Text>
          <View style={styles.planGrid}>
            {["TRIAL", "BASIC", "STANDARD", "PREMIUM"].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => handlePlanSelect(p)}
                style={[styles.planTile, form.plan === p && styles.planTileActive]}
              >
                <Text style={[styles.planTileLabel, form.plan === p && styles.planTileLabelActive]}>
                  {p === "TRIAL" ? "30 days\nTrial (Free)" : p}
                </Text>
                <Text style={[styles.planTilePrice, form.plan === p && styles.planTileLabelActive]}>
                  {p === "TRIAL" ? "Free" : `₹${PLAN_PRICES[p]}/mo`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customPriceRow}>
            <Switch
              value={form.custom_price}
              onValueChange={(v) => setForm({ ...form, custom_price: v, monthly_fee: v ? form.monthly_fee : String(PLAN_PRICES[form.plan] || "") })}
              trackColor={{ true: colors.primary }}
            />
            <Text style={styles.label}>Set custom price</Text>
          </View>

          {form.custom_price && (
            <>
              <Text style={styles.label}>Price per month (KES)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 499" value={String(form.monthly_fee)} onChangeText={(v) => setForm({ ...form, monthly_fee: v })} />
            </>
          )}

          <TouchableOpacity style={styles.registerButton} onPress={handleCreate}>
            <Text style={styles.registerButtonText}>Register Shop</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  fab: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, paddingHorizontal: 10, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 8, color: colors.text },
  chipRow: { paddingHorizontal: 16, marginBottom: 8, flexGrow: 0 },
  planChip: { paddingVertical: 4, paddingHorizontal: 10, marginRight: 6, borderRadius: 14 },
  planChipActive: {},
  planChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  planChipTextActive: { color: colors.primary, fontWeight: "700" },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, marginRight: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 12, color: colors.textSecondary },
  statusChipTextActive: { color: "#fff", fontWeight: "600" },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shopName: { fontWeight: "700", fontSize: 15, color: colors.text },
  ownerName: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionGray: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  actionGrayText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  actionGreen: { flex: 1, backgroundColor: "#dcfce7", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  actionGreenText: { color: "#166534", fontSize: 12, fontWeight: "600" },
  actionRed: { flex: 1, backgroundColor: "#fee2e2", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  actionRedText: { color: "#b91c1c", fontSize: 12, fontWeight: "600" },
  paymentRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: "#fff", color: colors.text },
  fieldError: { color: colors.danger, fontSize: 12, marginBottom: 4 },
  formContainer: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 16, marginBottom: 4, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },
  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  planTile: { width: "47%", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: "#fff" },
  planTileActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  planTileLabel: { fontSize: 12, fontWeight: "600", color: colors.text },
  planTileLabelActive: { color: "#fff" },
  planTilePrice: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  customPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  registerButton: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20, marginBottom: 40 },
  registerButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
