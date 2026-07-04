import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../api/client";

export default function POSScreen() {
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ milk_type: "", pack_size: "", quantity: "1" }]);
  const [paperBags, setPaperBags] = useState("0");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/inventory/milk-types/").then((r) => setMilkTypes(r.data.results || r.data));
    api.get("/inventory/pack-sizes/").then((r) => setPackSizes(r.data.results || r.data));
    api.get("/sales/customers/?page_size=100").then((r) => setCustomers(r.data.results || r.data));
  }, []);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { milk_type: "", pack_size: "", quantity: "1" }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setMessage(null);
    try {
      const payload = {
        customer: customerId || null,
        is_walk_in: !customerId,
        paper_bags_used: Number(paperBags) || 0,
        items: items
          .filter((it) => it.milk_type && it.pack_size && it.quantity)
          .map((it) => ({
            milk_type: Number(it.milk_type),
            pack_size: Number(it.pack_size),
            quantity: it.quantity,
          })),
      };
      const { data } = await api.post("/sales/orders/", payload);
      setMessage(`Order #${data.id} recorded. Total: KES ${data.total_amount} (${data.payment_status})`);
      setItems([{ milk_type: "", pack_size: "", quantity: "1" }]);
      setPaperBags("0");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Could not record this sale.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Point of Sale</Text>
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Text style={styles.label}>Customer</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={customerId} onValueChange={setCustomerId}>
          <Picker.Item label="Walk-in" value="" />
          {customers.map((c) => <Picker.Item key={c.id} label={c.name} value={String(c.id)} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Items</Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.itemRow}>
          <View style={[styles.pickerWrap, { flex: 1 }]}>
            <Picker selectedValue={item.milk_type} onValueChange={(v) => updateItem(idx, "milk_type", v)}>
              <Picker.Item label="Milk type" value="" />
              {milkTypes.map((m) => <Picker.Item key={m.id} label={m.name} value={String(m.id)} />)}
            </Picker>
          </View>
          <View style={[styles.pickerWrap, { flex: 1 }]}>
            <Picker selectedValue={item.pack_size} onValueChange={(v) => updateItem(idx, "pack_size", v)}>
              <Picker.Item label="Pack size" value="" />
              {packSizes.map((p) => <Picker.Item key={p.id} label={p.label} value={String(p.id)} />)}
            </Picker>
          </View>
          <TextInput
            style={[styles.input, { width: 60 }]}
            keyboardType="numeric"
            value={item.quantity}
            onChangeText={(v) => updateItem(idx, "quantity", v)}
          />
          {items.length > 1 && (
            <TouchableOpacity onPress={() => removeItem(idx)}><Text style={styles.remove}>×</Text></TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={addItem}><Text style={styles.addItem}>+ Add item</Text></TouchableOpacity>

      <Text style={styles.label}>Paper bags used</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={paperBags} onChangeText={setPaperBags} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Complete Sale</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, backgroundColor: "#fff" },
  pickerWrap: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  itemRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  remove: { color: "#dc2626", fontSize: 22, paddingHorizontal: 8 },
  addItem: { color: "#15803d", marginVertical: 8, fontWeight: "600" },
  button: { backgroundColor: "#16a34a", borderRadius: 6, padding: 14, alignItems: "center", marginVertical: 20 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  success: { backgroundColor: "#dcfce7", color: "#166534", padding: 10, borderRadius: 6, marginBottom: 12 },
});
