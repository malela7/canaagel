import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const GROUPS = [
  {
    label: "Sales",
    items: [
      { name: "Point of Sell", icon: "cart-outline", screen: "POS_TAB" },
      { name: "Sell Report", icon: "document-text-outline", screen: "SalesReport" },
    ],
  },
  {
    label: "Stock",
    items: [
      { name: "Inventory", icon: "layers-outline", screen: "Inventory" },
      { name: "Expenses", icon: "receipt-outline", screen: "Expenses" },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Customer", icon: "people-outline", screen: "Customers" },
      { name: "Supplier", icon: "cube-outline", screen: "Supplier" },
      { name: "Employee", icon: "person-add-outline", screen: "Employees", ownerOnly: true },
    ],
  },
];

export default function MilkHomeScreen() {
  const navigation = useNavigation();
  const { accent } = useTheme(); const colors = { primary: accent?.value || "#16a34a" };
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const handleTile = (screen) => {
    if (screen === "POS_TAB") {
      navigation.getParent()?.navigate("POS");
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.welcome}>Welcome back,</Text>
        <Text style={[s.shopName, { color: colors.primary }]}>{user?.shop_name || user?.username}</Text>
      </View>

      {GROUPS.map((group) => {
        const visibleItems = group.items.filter((it) => !it.ownerOnly || isOwner);
        if (!visibleItems.length) return null;
        return (
          <View key={group.label} style={s.group}>
            <Text style={s.groupLabel}>{group.label.toUpperCase()}</Text>
            <View style={s.tileGrid}>
              {visibleItems.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[s.tile, item.screen === "POS_TAB" && { backgroundColor: colors.primary }]}
                  onPress={() => handleTile(item.screen)}
                >
                  <Ionicons
                    name={item.icon}
                    size={28}
                    color={item.screen === "POS_TAB" ? "#fff" : colors.primary}
                  />
                  <Text style={[s.tileTxt, item.screen === "POS_TAB" && { color: "#fff" }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  welcome: { fontSize: 13, color: "#9ca3af" },
  shopName: { fontSize: 22, fontWeight: "800" },
  group: { marginBottom: 20 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 10, letterSpacing: 1 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tileTxt: { fontSize: 13, fontWeight: "700", color: "#374151", textAlign: "center" },
});
