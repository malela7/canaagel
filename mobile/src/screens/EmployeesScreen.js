import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const PERMISSIONS = [
  { key: "can_sell", label: "Use POS / sell" },
  { key: "can_manage_customers", label: "Manage customers" },
  { key: "can_manage_inventory", label: "Manage inventory & prices" },
  { key: "can_view_inventory", label: "View inventory" },
  { key: "can_manage_suppliers", label: "Manage suppliers" },
  { key: "can_record_payments", label: "Record customer payments" },
  { key: "can_manage_delivery", label: "Manage delivery" },
  { key: "can_view_reports", label: "View reports" },
];

const defaultPerms = Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]));
const emptyForm = { username: "", password: "", first_name: "", last_name: "", ...defaultPerms };

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/auth/employees/");
      setEmployees(r.data.results || r.data);
    } catch {
      Alert.alert("Error", "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createEmployee = async () => {
    setError("");
    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/employees/", form);
      setForm(emptyForm);
      setShowPassword(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      const msg = data && typeof data === "object"
        ? Object.values(data).flat().join(" ")
        : "Could not create employee.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (emp, key, currentVal) => {
    if (currentVal) {
      Alert.alert(
        "Remove permission?",
        `Remove "${PERMISSIONS.find((p) => p.key === key)?.label}" from ${emp.username}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove", style: "destructive",
            onPress: async () => {
              await api.patch(`/auth/employees/${emp.id}/`, { [key]: false });
              load();
            },
          },
        ]
      );
    } else {
      api.patch(`/auth/employees/${emp.id}/`, { [key]: true }).then(load);
    }
  };

  const initials = (emp) => {
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.username;
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employees</Text>

      <FlatList
        data={employees}
        keyExtractor={(e) => String(e.id)}
        ListEmptyComponent={!loading && <Text style={styles.empty}>No employees yet.</Text>}
        ListHeaderComponent={
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add employee</Text>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <Text style={styles.label}>Username *</Text>
              <TextInput style={styles.input} placeholder="e.g. ali_cashier" autoCapitalize="none" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} />
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                  placeholder="Set a password"
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(v) => setForm({ ...form, password: v })}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Ali" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Last name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Hassan" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
                </View>
              </View>
              <Text style={[styles.label, { marginTop: 10 }]}>Initial permissions</Text>
              {PERMISSIONS.map((p) => (
                <View key={p.key} style={styles.permRow}>
                  <Text style={styles.permLabel}>{p.label}</Text>
                  <Switch
                    value={!!form[p.key]}
                    onValueChange={(v) => setForm({ ...form, [p.key]: v })}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addBtn} onPress={createEmployee} disabled={saving}>
                <Text style={styles.addBtnText}>{saving ? "Creating…" : "Create employee"}</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />}
            {employees.length > 0 && <Text style={styles.sectionLabel}>EMPLOYEES</Text>}
          </View>
        }
        renderItem={({ item: emp }) => (
          <View style={styles.empCard}>
            <View style={styles.empHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{initials(emp)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.username}</Text>
                {!!(emp.first_name || emp.last_name) && (
                  <Text style={styles.empMeta}>{`${emp.first_name || ""} ${emp.last_name || ""}`.trim()}</Text>
                )}
              </View>
            </View>
            {PERMISSIONS.map((p) => (
              <View key={p.key} style={styles.permRow}>
                <Text style={styles.permLabel}>{p.label}</Text>
                <Switch
                  value={!!emp[p.key]}
                  onValueChange={(v) => togglePermission(emp, p.key, !!emp[p.key])}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: "bold", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  formCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 16 },
  formTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 4 },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 6, marginBottom: 3 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: "#fff", color: colors.text },
  passwordWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, backgroundColor: "#fff", marginBottom: 4 },
  eyeBtn: { padding: 6 },
  twoCol: { flexDirection: "row", gap: 10 },
  permRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" },
  permLabel: { fontSize: 13, color: colors.text, flex: 1 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 12 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  empCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 12 },
  empHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empName: { fontWeight: "700", fontSize: 14, color: colors.text },
  empMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 24 },
});
