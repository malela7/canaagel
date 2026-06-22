import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function SuperAdminSettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.meta}>Signed in as {user?.username} (Super Admin)</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  logoutButton: { backgroundColor: colors.danger, borderRadius: 6, padding: 12, alignItems: "center" },
  logoutButtonText: { color: "#fff", fontWeight: "600" },
});
