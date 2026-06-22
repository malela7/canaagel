import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme";

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Row({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.textSecondary} />
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function SuperAdminSettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { accent, accentKey, setAccent, options } = useTheme();

  const initials = (user?.username || "?").slice(0, 2).toUpperCase();
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const confirmLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again to access the dashboard.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <SectionLabel>PROFILE</SectionLabel>
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: accent.value }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.username}</Text>
          <Text style={styles.profileMeta}>{user?.email || "No email on file"}</Text>
          <View style={[styles.roleBadge, { backgroundColor: accent.value + "22" }]}>
            <Text style={[styles.roleBadgeText, { color: accent.dark }]}>Super Admin</Text>
          </View>
        </View>
      </View>

      <SectionLabel>MANAGEMENT</SectionLabel>
      <View style={styles.card}>
        <Row icon="storefront-outline" label="Manage Shops" onPress={() => navigation.navigate("Shops")} />
        <Row icon="bar-chart-outline" label="Subscriptions & Reports" onPress={() => navigation.navigate("Reports")} />
        <Row icon="home-outline" label="Dashboard" onPress={() => navigation.navigate("Home")} />
      </View>

      <SectionLabel>COLORS TO USE</SectionLabel>
      <View style={styles.card}>
        <Text style={styles.swatchHint}>Pick the accent color used across your dashboard tabs and buttons.</Text>
        <View style={styles.swatchRow}>
          {options.map((o) => (
            <TouchableOpacity key={o.key} onPress={() => setAccent(o.key)} style={styles.swatchWrap}>
              <View style={[styles.swatch, { backgroundColor: o.value }, accentKey === o.key && styles.swatchActive]}>
                {accentKey === o.key && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <Text style={styles.swatchLabel}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionLabel>MORE</SectionLabel>
      <View style={styles.card}>
        <Row icon="information-circle-outline" label={`App version ${appVersion}`} />
        <Row icon="help-circle-outline" label="Help & support" onPress={() => Linking.openURL("mailto:support@canolee.app")} />
        <Row icon="document-text-outline" label="About Canolee" onPress={() => Alert.alert("Canolee", "Milk Shop Management Platform")} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 16, marginBottom: 6, letterSpacing: 0.5 },
  card: { backgroundColor: "#fff", borderRadius: 10, overflow: "hidden" },
  profileCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  profileName: { fontWeight: "700", fontSize: 15, color: colors.text },
  profileMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginTop: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { fontSize: 14, color: colors.text },
  swatchHint: { fontSize: 12, color: colors.textSecondary, padding: 14, paddingBottom: 4 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, padding: 14, paddingTop: 8 },
  swatchWrap: { alignItems: "center" },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: colors.text },
  swatchLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  logoutButton: { backgroundColor: colors.danger, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24, marginBottom: 40 },
  logoutButtonText: { color: "#fff", fontWeight: "700" },
});
