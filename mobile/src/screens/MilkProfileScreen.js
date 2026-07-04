import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function MilkProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const rows = [
    { label: "Username", value: user?.username },
    { label: "Role", value: user?.role },
    { label: "Shop", value: user?.shop_name || "—" },
    { label: "Shop Type", value: user?.shop_type || "MILK" },
  ];

  return (
    <View style={s.root}>
      <View style={[s.avatar, { backgroundColor: colors.primary }]}>
        <Text style={s.avatarTxt}>{(user?.username || "U").slice(0, 2).toUpperCase()}</Text>
      </View>

      <View style={s.card}>
        {rows.map((r) => (
          <View key={r.label} style={s.row}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={s.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb", alignItems: "center", paddingTop: 40, padding: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  avatarTxt: { color: "#fff", fontSize: 26, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderRadius: 14, width: "100%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowLabel: { fontSize: 13, color: "#9ca3af" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  logoutBtn: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#dc2626", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 40, marginTop: 32 },
  logoutTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
