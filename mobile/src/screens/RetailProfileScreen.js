import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function RetailProfileScreen({ navigation }) {
  const { accent } = useTheme();
  const { user, logout } = useAuth();
  const isOwner = user?.role === "OWNER";

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const s = styles(accent);

  return (
    <ScrollView style={s.container}>
      {/* Profile card */}
      <View style={[s.profileCard, { backgroundColor: accent }]}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={s.profileUsername}>@{user?.username}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Navigation sections */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Shop</Text>
        <MenuItem icon="people-outline" label="Customers" onPress={() => navigation.navigate("Customers")} accent={accent} />
        <MenuItem icon="cube-outline" label="Products" onPress={() => navigation.navigate("Products")} accent={accent} />
        <MenuItem icon="receipt-outline" label="Expenses" onPress={() => navigation.navigate("Expenses")} accent={accent} />
        <MenuItem icon="file-tray-full-outline" label="Stock Orders" onPress={() => navigation.navigate("StockOrders")} accent={accent} />
      </View>

      {isOwner && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Management</Text>
          <MenuItem icon="person-add-outline" label="Employees" onPress={() => navigation.navigate("Employees")} accent={accent} />
          <MenuItem icon="card-outline" label="Subscription & Billing" onPress={() => navigation.navigate("Subscription")} accent={accent} />
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, accent }) {
  return (
    <TouchableOpacity style={styles(accent).menuItem} onPress={onPress}>
      <View style={[styles(accent).menuIcon, { backgroundColor: accent + "15" }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles(accent).menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = (accent) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    profileCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, margin: 16, borderRadius: 16 },
    avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
    profileName: { color: "#fff", fontSize: 16, fontWeight: "700" },
    profileUsername: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
    roleBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 6 },
    roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    section: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
    menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
    logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    logoutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
  });
