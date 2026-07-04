import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const TABS = ["Setup", "Suppliers", "Goods Received"];

const emptyReceiptItem = { milk_type: null, pack_size: null, quantity: "", unit_cost: "" };

// ── Helpers ────────────────────────────────────────────────
const AVATAR_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];
const avatarColor = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ── Edit Price/Stock Modal ─────────────────────────────────
function EditComboModal({ combo, onSave, onClose }) {
  const [costPrice, setCostPrice] = useState(String(combo?.cost_price ?? "0"));
  const [sellPrice, setSellPrice] = useState(String(combo?.amount ?? ""));
  const [qty, setQty] = useState(String(combo?.quantity ?? "0"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!sellPrice.trim()) { Alert.alert("Missing", "Enter sell price."); return; }
    setSaving(true);
    try {
      await Promise.all([
        api.post("/inventory/prices/set/", {
          milk_type: combo.milk_type,
          pack_size: combo.pack_size,
          amount: parseFloat(sellPrice) || 0,
          cost_price: parseFloat(costPrice) || 0,
        }),
        combo.stock_id
          ? api.patch(`/inventory/stock/${combo.stock_id}/`, { quantity: parseFloat(qty) || 0 })
          : api.post("/inventory/stock/", {
              milk_type: combo.milk_type,
              pack_size: combo.pack_size,
              quantity: parseFloat(qty) || 0,
            }),
      ]);
      onSave();
    } catch {
      Alert.alert("Error", "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ms.overlay}>
          <TouchableWithoutFeedback>
            <View style={ms.sheet}>
              <View style={ms.handle} />
              <Text style={ms.title}>{combo?.milk_type_name} · {combo?.pack_size_label}</Text>
              <Text style={ms.sub}>Edit prices and stock</Text>
              <Text style={ms.lbl}>Cost price (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={costPrice} onChangeText={setCostPrice} autoFocus />
              <Text style={ms.lbl}>Sell price (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={sellPrice} onChangeText={setSellPrice} />
              <Text style={ms.lbl}>Stock quantity (units)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={qty} onChangeText={setQty} />
              <View style={ms.row}>
                <TouchableOpacity style={ms.cancel} onPress={onClose}>
                  <Text style={ms.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.save} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ms.saveTxt}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  lbl: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 10, marginBottom: 4 },
  inp: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", fontSize: 16, color: "#111827" },
  row: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancel: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, alignItems: "center" },
  cancelTxt: { color: "#6b7280", fontWeight: "600" },
  save: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// ── Bill Modal ─────────────────────────────────────────────
function AddBillModal({ supplier, onSave, onClose }) {
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!total.trim()) { Alert.alert("Missing", "Enter total amount."); return; }
    setSaving(true);
    try {
      await api.post(`/inventory/suppliers/${supplier.id}/bills/`, {
        date,
        total_amount: parseFloat(total) || 0,
        amount_paid: parseFloat(paid) || 0,
        note,
      });
      onSave();
    } catch {
      Alert.alert("Error", "Could not save bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ms.overlay}>
          <TouchableWithoutFeedback>
            <View style={ms.sheet}>
              <View style={ms.handle} />
              <Text style={ms.title}>Add Bill — {supplier?.name}</Text>
              <Text style={ms.sub}>Record a delivery/bill</Text>
              <Text style={ms.lbl}>Date (YYYY-MM-DD)</Text>
              <TextInput style={ms.inp} value={date} onChangeText={setDate} autoFocus />
              <Text style={ms.lbl}>Total amount (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
              <Text style={ms.lbl}>Amount paid (KES)</Text>
              <TextInput style={ms.inp} keyboardType="decimal-pad" value={paid} onChangeText={setPaid} placeholder="0" />
              <Text style={ms.lbl}>Note</Text>
              <TextInput style={ms.inp} value={note} onChangeText={setNote} placeholder="Optional" />
              <View style={ms.row}>
                <TouchableOpacity style={ms.cancel} onPress={onClose}>
                  <Text style={ms.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.save} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ms.saveTxt}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Setup Tab ──────────────────────────────────────────────
function SetupTab({ milkTypes, packSizes, prices, stock, onRefresh }) {
  const [newMilkName, setNewMilkName] = useState("");
  const [newPackLabel, setNewPackLabel] = useState("");
  const [newPackLitres, setNewPackLitres] = useState("");
  const [editCombo, setEditCombo] = useState(null);

  // Build unified combo table: all milk_type × pack_size combos that have a price or stock entry
  const combos = [];
  const seen = new Set();
  for (const p of prices) {
    const key = `${p.milk_type}-${p.pack_size}`;
    if (!seen.has(key)) {
      seen.add(key);
      const stockEntry = stock.find(s => String(s.milk_type) === String(p.milk_type) && String(s.pack_size) === String(p.pack_size));
      combos.push({
        key,
        milk_type: p.milk_type,
        milk_type_name: p.milk_type_name,
        pack_size: p.pack_size,
        pack_size_label: p.pack_size_label,
        cost_price: p.cost_price ?? 0,
        amount: p.amount,
        quantity: stockEntry?.quantity ?? 0,
        stock_id: stockEntry?.id ?? null,
      });
    }
  }
  // Also show stock entries with no price
  for (const s of stock) {
    const key = `${s.milk_type}-${s.pack_size}`;
    if (!seen.has(key)) {
      seen.add(key);
      combos.push({
        key,
        milk_type: s.milk_type,
        milk_type_name: s.milk_type_name,
        pack_size: s.pack_size,
        pack_size_label: s.pack_size_label,
        cost_price: 0,
        amount: null,
        quantity: s.quantity,
        stock_id: s.id,
      });
    }
  }

  const addMilkType = async () => {
    if (!newMilkName.trim()) return;
    try { await api.post("/inventory/milk-types/", { name: newMilkName.trim() }); setNewMilkName(""); onRefresh(); }
    catch (e) {
      const msg = e?.response?.data?.name?.[0] || "Could not add milk type.";
      Alert.alert("Error", msg);
    }
  };

  const addPackSize = async () => {
    if (!newPackLabel.trim()) return;
    try {
      await api.post("/inventory/pack-sizes/", {
        label: newPackLabel.trim(),
        litres: parseFloat(newPackLitres) || 0,
      });
      setNewPackLabel(""); setNewPackLitres("");
      onRefresh();
    } catch (e) {
      const msg = e?.response?.data?.label?.[0] || "Could not add pack size.";
      Alert.alert("Error", msg);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.padded}>
      {editCombo && (
        <EditComboModal
          combo={editCombo}
          onSave={() => { setEditCombo(null); onRefresh(); }}
          onClose={() => setEditCombo(null)}
        />
      )}

      {/* ── Milk Types ── */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>MILK TYPES</Text>
        {milkTypes.length === 0 && <Text style={s.empty}>No milk types yet.</Text>}
        {milkTypes.map((mt, i) => (
          <View key={mt.id} style={s.simpleRow}>
            <View style={[s.dot2, { backgroundColor: avatarColor(i) }]} />
            <Text style={s.rowLabel}>{mt.name}</Text>
          </View>
        ))}
        <View style={s.addRow}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder="e.g. Cow" value={newMilkName} onChangeText={setNewMilkName} />
          <TouchableOpacity style={s.addBtn} onPress={addMilkType}><Text style={s.addBtnTxt}>Add</Text></TouchableOpacity>
        </View>
      </View>

      {/* ── Pack Sizes ── */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>PACK SIZES</Text>
        {packSizes.length === 0 && <Text style={s.empty}>No pack sizes yet.</Text>}
        {packSizes.map((ps) => (
          <View key={ps.id} style={s.simpleRow}>
            <Ionicons name="cube-outline" size={16} color={colors.primary} />
            <Text style={[s.rowLabel, { marginLeft: 8 }]}>{ps.label}</Text>
            <Text style={s.meta}>{ps.litres}L</Text>
          </View>
        ))}
        <View style={s.addRow}>
          <TextInput style={[s.input, { flex: 2 }]} placeholder="Label e.g. 2L" value={newPackLabel} onChangeText={setNewPackLabel} />
          <TextInput style={[s.input, { flex: 1 }]} placeholder="Litres" keyboardType="decimal-pad" value={newPackLitres} onChangeText={setNewPackLitres} />
          <TouchableOpacity style={s.addBtn} onPress={addPackSize}><Text style={s.addBtnTxt}>Add</Text></TouchableOpacity>
        </View>
      </View>

      {/* ── Prices & Stock combined ── */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>PRICES & STOCK</Text>
        <Text style={s.hint}>Tap a row to edit cost price, sell price and quantity</Text>
        {combos.length === 0 && <Text style={s.empty}>No combinations yet. Add milk types and pack sizes first.</Text>}
        {/* Table header */}
        {combos.length > 0 && (
          <View style={s.tableHead}>
            <Text style={[s.thCell, { flex: 2 }]}>Type / Pack</Text>
            <Text style={s.thCell}>Cost</Text>
            <Text style={s.thCell}>Sell</Text>
            <Text style={s.thCell}>Qty</Text>
          </View>
        )}
        {combos.map((c, i) => (
          <TouchableOpacity key={c.key} onPress={() => setEditCombo(c)}
            style={[s.tableRow, i % 2 === 1 && { backgroundColor: "#f9fafb" }]}>
            <View style={{ flex: 2 }}>
              <Text style={s.tdName}>{c.milk_type_name}</Text>
              <Text style={s.tdSub}>{c.pack_size_label}</Text>
            </View>
            <Text style={s.tdCell}>{c.cost_price > 0 ? Number(c.cost_price) : "—"}</Text>
            <Text style={[s.tdCell, { color: colors.primary, fontWeight: "700" }]}>{c.amount ? Number(c.amount) : "—"}</Text>
            <Text style={s.tdCell}>{Number(c.quantity)}</Text>
          </TouchableOpacity>
        ))}

        {/* Add new combo buttons: milk type × pack size chips */}
        {milkTypes.length > 0 && packSizes.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>ADD / UPDATE COMBO</Text>
            <AddComboInline milkTypes={milkTypes} packSizes={packSizes} onSave={onRefresh} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── Inline combo add form ──────────────────────────────────
function AddComboInline({ milkTypes, packSizes, onSave }) {
  const [milkType, setMilkType] = useState(null);
  const [packSize, setPackSize] = useState(null);
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!milkType || !packSize) { Alert.alert("Missing", "Select milk type and pack size."); return; }
    if (!sell.trim()) { Alert.alert("Missing", "Enter sell price."); return; }
    setSaving(true);
    try {
      const stockEntry = null; // will create new stock entry
      await Promise.all([
        api.post("/inventory/prices/set/", {
          milk_type: milkType,
          pack_size: packSize,
          amount: parseFloat(sell) || 0,
          cost_price: parseFloat(cost) || 0,
        }),
        api.post("/inventory/stock/", {
          milk_type: milkType,
          pack_size: packSize,
          quantity: parseFloat(qty) || 0,
        }).catch(() => {}), // stock may already exist — ignore duplicate error
      ]);
      setMilkType(null); setPackSize(null); setCost(""); setSell(""); setQty("");
      onSave();
    } catch {
      Alert.alert("Error", "Could not save combo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.lbl}>Milk type</Text>
      <View style={s.chipRow}>
        {milkTypes.map((mt) => (
          <TouchableOpacity key={mt.id} onPress={() => setMilkType(mt.id)}
            style={[s.chip, milkType === mt.id && s.chipActive]}>
            <Text style={[s.chipTxt, milkType === mt.id && s.chipTxtActive]}>{mt.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.lbl}>Pack size</Text>
      <View style={s.chipRow}>
        {packSizes.map((ps) => (
          <TouchableOpacity key={ps.id} onPress={() => setPackSize(ps.id)}
            style={[s.chip, packSize === ps.id && s.chipActive]}>
            <Text style={[s.chipTxt, packSize === ps.id && s.chipTxtActive]}>{ps.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.threeCol}>
        <View style={{ flex: 1 }}>
          <Text style={s.lbl}>Cost (KES)</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" value={cost} onChangeText={setCost} placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.lbl}>Sell (KES) *</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" value={sell} onChangeText={setSell} placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.lbl}>Qty (units)</Text>
          <TextInput style={s.input} keyboardType="decimal-pad" value={qty} onChangeText={setQty} placeholder="0" />
        </View>
      </View>
      <TouchableOpacity style={[s.primaryBtn, { marginTop: 10 }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Save Combo</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ── Suppliers Tab ──────────────────────────────────────────
function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [billModal, setBillModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/suppliers/");
      setSuppliers(res.data.results || res.data);
    } catch {
      Alert.alert("Error", "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSupplier = async () => {
    if (!name.trim()) { Alert.alert("Missing", "Enter supplier name."); return; }
    setAdding(true);
    try {
      await api.post("/inventory/suppliers/", { name: name.trim(), phone: phone.trim() });
      setName(""); setPhone(""); load();
    } catch (e) {
      const msg = e?.response?.data?.name?.[0] || "Could not add supplier.";
      Alert.alert("Error", msg);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <View style={s.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={s.padded}>
      {billModal && (
        <AddBillModal
          supplier={billModal}
          onSave={() => { setBillModal(null); load(); }}
          onClose={() => setBillModal(null)}
        />
      )}

      {/* Add supplier form */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>ADD SUPPLIER</Text>
        <TextInput style={s.input} placeholder="Supplier name" value={name} onChangeText={setName} />
        <TextInput style={[s.input, { marginTop: 8 }]} placeholder="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TouchableOpacity style={[s.primaryBtn, { marginTop: 10 }]} onPress={addSupplier} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Add Supplier</Text>}
        </TouchableOpacity>
      </View>

      {/* Supplier list */}
      <Text style={s.sectionLabel}>SUPPLIERS</Text>
      {suppliers.length === 0 && <Text style={s.empty}>No suppliers yet.</Text>}
      {suppliers.map((sup, i) => {
        const owed = sup.total_owed ?? 0;
        const isOpen = expanded === sup.id;
        return (
          <View key={sup.id} style={s.card}>
            <TouchableOpacity style={s.supRow} onPress={() => setExpanded(isOpen ? null : sup.id)}>
              <View style={[s.supAvatar, { backgroundColor: avatarColor(i) }]}>
                <Text style={s.supAvatarTxt}>{(sup.name || "?").slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.supName}>{sup.name}</Text>
                {sup.phone ? <Text style={s.supPhone}>{sup.phone}</Text> : null}
              </View>
              {Number(owed) > 0 && (
                <View style={s.owedBadge}>
                  <Text style={s.owedTxt}>KES {Number(owed).toLocaleString()}</Text>
                </View>
              )}
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {isOpen && (
              <View style={{ marginTop: 10 }}>
                {(sup.bills || []).length === 0 && <Text style={s.empty}>No bills yet.</Text>}
                {(sup.bills || []).map((bill) => (
                  <View key={bill.id} style={s.billRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.billDate}>{bill.date}</Text>
                      {bill.note ? <Text style={s.billNote}>{bill.note}</Text> : null}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.billTotal}>KES {Number(bill.total_amount).toLocaleString()}</Text>
                      {Number(bill.balance) > 0
                        ? <Text style={s.billBalance}>Owed: {Number(bill.balance).toLocaleString()}</Text>
                        : <Text style={s.billPaid}>Paid</Text>
                      }
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={s.addLineBtn} onPress={() => setBillModal(sup)}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={s.addLineTxt}>Add Bill</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Goods Received Tab ────────────────────────────────────
const emptyRow = () => ({
  _key: Math.random().toString(36).slice(2),
  milk_type: null,
  pack_size: null,
  product_name: "",
  cost_price: "",
  sell_price: "",
  quantity: "",
  expiry_date: "",
});

// Picker modal for selecting milk type or pack size in a row
function PickerModal({ title, options, selected, onSelect, onClose }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={pm.overlay}>
          <TouchableWithoutFeedback>
            <View style={pm.sheet}>
              <View style={pm.handle} />
              <Text style={pm.title}>{title}</Text>
              {options.map((opt) => (
                <TouchableOpacity key={opt.id} style={[pm.row, String(selected) === String(opt.id) && pm.rowActive]}
                  onPress={() => { onSelect(opt.id); onClose(); }}>
                  <Text style={[pm.rowTxt, String(selected) === String(opt.id) && pm.rowTxtActive]}>{opt.label || opt.name}</Text>
                  {String(selected) === String(opt.id) && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: "60%" },
  handle: { width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  row: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowActive: { backgroundColor: "#f0fdf4" },
  rowTxt: { fontSize: 15, color: "#374151" },
  rowTxtActive: { color: colors.primary, fontWeight: "700" },
});

function GoodsTab({ milkTypes, packSizes, stock, onRefresh }) {
  const [supplierName, setSupplierName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [picker, setPicker] = useState(null); // { rowKey, field, options, title }

  const updateRow = (key, field, val) =>
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: val } : r));

  const deleteRow = (key) => setRows((prev) => prev.filter((r) => r._key !== key));

  const totalAmount = (r) => {
    const cost = parseFloat(r.cost_price) || 0;
    const qty = parseFloat(r.quantity) || 0;
    return cost * qty;
  };

  const grandTotal = rows.reduce((sum, r) => sum + totalAmount(r), 0);

  const addSupplier = () => {
    // Navigate to Suppliers tab — just give info for now
  };

  const submit = async () => {
    const valid = rows.filter(r => r.milk_type && r.pack_size && parseFloat(r.quantity) > 0);
    if (valid.length === 0) { Alert.alert("Validation", "Add at least one row with milk type, pack size and quantity."); return; }
    setSaving(true);
    try {
      const errors = [], received = [];
      for (const it of valid) {
        const stockEntry = stock.find(
          (s) => String(s.milk_type) === String(it.milk_type) && String(s.pack_size) === String(it.pack_size)
        );
        const mt = milkTypes.find((m) => String(m.id) === String(it.milk_type));
        const ps = packSizes.find((p) => String(p.id) === String(it.pack_size));
        const qty = parseFloat(it.quantity);
        if (!stockEntry) {
          // create stock entry
          await api.post("/inventory/stock/", {
            milk_type: it.milk_type, pack_size: it.pack_size, quantity: qty,
          }).catch(() => errors.push(`Could not create stock for ${mt?.name}/${ps?.label}`));
        } else {
          await api.patch(`/inventory/stock/${stockEntry.id}/`, { quantity: parseFloat(stockEntry.quantity) + qty });
        }
        // update cost price if provided
        if (it.cost_price || it.sell_price) {
          await api.post("/inventory/prices/set/", {
            milk_type: it.milk_type,
            pack_size: it.pack_size,
            amount: parseFloat(it.sell_price) || 0,
            cost_price: parseFloat(it.cost_price) || 0,
          }).catch(() => {});
        }
        received.push({ name: `${mt?.name}/${ps?.label}`, qty });
      }
      if (errors.length) Alert.alert("Some items skipped", errors.join("\n"));
      if (received.length) {
        setHistory((prev) => [{ id: Date.now(), supplier: supplierName || "Unknown", date, items: received, total: grandTotal }, ...prev]);
        setSupplierName(""); setDate(new Date().toISOString().slice(0, 10));
        setRows([emptyRow()]);
        onRefresh();
        Alert.alert("Saved", `${received.length} item(s) updated.`);
      }
    } catch { Alert.alert("Error", "Could not save."); }
    finally { setSaving(false); }
  };

  const mtOptions = milkTypes.map(m => ({ id: m.id, label: m.name }));
  const psOptions = packSizes.map(p => ({ id: p.id, label: `${p.label} (${p.litres}L)` }));

  return (
    <View style={{ flex: 1 }}>
      {picker && (
        <PickerModal
          title={picker.title}
          options={picker.options}
          selected={picker.selected}
          onSelect={(val) => updateRow(picker.rowKey, picker.field, val)}
          onClose={() => setPicker(null)}
        />
      )}

      <ScrollView contentContainerStyle={s.padded}>
        {/* Header bar with Add Product + Add Supplier */}
        <View style={gr.topBar}>
          <TouchableOpacity style={gr.addProductBtn} onPress={() => setRows(p => [...p, emptyRow()])}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={gr.addProductTxt}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={gr.addSupplierBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={gr.addSupplierTxt}>Add Supplier</Text>
          </TouchableOpacity>
        </View>

        {/* Meta row */}
        <View style={gr.metaRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.lbl}>Supplier</Text>
            <TextInput style={s.input} placeholder="Supplier name" value={supplierName} onChangeText={setSupplierName} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Date</Text>
            <TextInput style={s.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
          </View>
        </View>

        {/* Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator style={gr.tableWrap}>
          <View>
            {/* Table header */}
            <View style={gr.thead}>
              <Text style={[gr.th, gr.colAction]}>Action</Text>
              <Text style={[gr.th, gr.colSN]}>SN</Text>
              <Text style={[gr.th, gr.colProduct]}>Product Name</Text>
              <Text style={[gr.th, gr.colPrice]}>{"Cost Price\nKsh"}</Text>
              <Text style={[gr.th, gr.colPrice]}>{"Sell Price\nKsh"}</Text>
              <Text style={[gr.th, gr.colQty]}>Quantity</Text>
              <Text style={[gr.th, gr.colExpiry]}>Expiry Date</Text>
              <Text style={[gr.th, gr.colTotal]}>Total Ksh</Text>
            </View>

            {/* Rows */}
            {rows.map((row, idx) => {
              const mt = milkTypes.find(m => String(m.id) === String(row.milk_type));
              const ps = packSizes.find(p => String(p.id) === String(row.pack_size));
              const rowLabel = mt && ps ? `${mt.name} / ${ps.label}` : mt ? mt.name : "";
              const total = totalAmount(row);
              return (
                <View key={row._key} style={[gr.trow, idx % 2 === 1 && gr.trowAlt]}>
                  {/* Action */}
                  <View style={[gr.td, gr.colAction]}>
                    <TouchableOpacity onPress={() => deleteRow(row._key)} disabled={rows.length === 1}>
                      <Ionicons name="trash-outline" size={18} color={rows.length === 1 ? "#d1d5db" : "#ef4444"} />
                    </TouchableOpacity>
                  </View>
                  {/* SN */}
                  <View style={[gr.td, gr.colSN]}>
                    <Text style={gr.snTxt}>{idx + 1}</Text>
                  </View>
                  {/* Product Name — tap to pick milk type + pack size */}
                  <TouchableOpacity style={[gr.td, gr.colProduct]}
                    onPress={() => setPicker({ rowKey: row._key, field: "milk_type", options: mtOptions, title: "Select Milk Type", selected: row.milk_type })}>
                    {rowLabel
                      ? <Text style={gr.productTxt}>{rowLabel}</Text>
                      : <Text style={gr.productPlaceholder}>Tap to select</Text>}
                    {mt && !ps && (
                      <TouchableOpacity onPress={() => setPicker({ rowKey: row._key, field: "pack_size", options: psOptions, title: "Select Pack Size", selected: row.pack_size })}>
                        <Text style={[gr.productPlaceholder, { color: "#f59e0b" }]}>Select pack ▸</Text>
                      </TouchableOpacity>
                    )}
                    {mt && ps && (
                      <TouchableOpacity onPress={() => setPicker({ rowKey: row._key, field: "pack_size", options: psOptions, title: "Select Pack Size", selected: row.pack_size })}>
                        <Text style={gr.packTxt}>{ps.label}</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                  {/* Cost Price */}
                  <View style={[gr.td, gr.colPrice]}>
                    <TextInput style={gr.cellInput} keyboardType="decimal-pad" placeholder="0"
                      value={row.cost_price} onChangeText={(v) => updateRow(row._key, "cost_price", v)} />
                  </View>
                  {/* Sell Price */}
                  <View style={[gr.td, gr.colPrice]}>
                    <TextInput style={gr.cellInput} keyboardType="decimal-pad" placeholder="0"
                      value={row.sell_price} onChangeText={(v) => updateRow(row._key, "sell_price", v)} />
                  </View>
                  {/* Quantity */}
                  <View style={[gr.td, gr.colQty]}>
                    <TextInput style={gr.cellInput} keyboardType="decimal-pad" placeholder="0"
                      value={row.quantity} onChangeText={(v) => updateRow(row._key, "quantity", v)} />
                  </View>
                  {/* Expiry */}
                  <View style={[gr.td, gr.colExpiry]}>
                    <TextInput style={gr.cellInput} placeholder="YYYY-MM-DD"
                      value={row.expiry_date} onChangeText={(v) => updateRow(row._key, "expiry_date", v)} />
                  </View>
                  {/* Total */}
                  <View style={[gr.td, gr.colTotal]}>
                    <Text style={gr.totalTxt}>{total > 0 ? total.toLocaleString() : "0"}</Text>
                  </View>
                </View>
              );
            })}

            {/* Grand total row */}
            <View style={gr.totalRow}>
              <Text style={[gr.th, { flex: 1, textAlign: "right", paddingRight: 8 }]}>Grand Total:</Text>
              <Text style={[gr.th, gr.colTotal, { color: colors.primary }]}>{grandTotal.toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Confirm button */}
        <TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Confirm Goods Received</Text>}
        </TouchableOpacity>

        {/* History */}
        {history.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>RECEIVED THIS SESSION</Text>
            {history.map((r) => (
              <View key={r.id} style={s.histCard}>
                <View style={s.histHead}>
                  <View>
                    <Text style={s.histSup}>{r.supplier}</Text>
                    <Text style={s.histDate}>{r.date}</Text>
                  </View>
                  <View>
                    <View style={s.greenBadge}><Text style={s.greenBadgeTxt}>{r.items.length} item{r.items.length !== 1 ? "s" : ""}</Text></View>
                    {r.total > 0 && <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, textAlign: "right", marginTop: 3 }}>KES {r.total.toLocaleString()}</Text>}
                  </View>
                </View>
                {r.items.map((it, i) => (
                  <View key={i} style={s.histLine}>
                    <Text style={s.histLineTxt}>• {it.name}</Text>
                    <Text style={s.histLineQty}>+{it.qty}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────
export default function InventoryScreen() {
  const [tab, setTab] = useState(0);
  const [milkTypes, setMilkTypes] = useState([]);
  const [packSizes, setPackSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [mt, ps, pr, st] = await Promise.all([
        api.get("/inventory/milk-types/"),
        api.get("/inventory/pack-sizes/"),
        api.get("/inventory/prices/"),
        api.get("/inventory/stock/"),
      ]);
      setMilkTypes(mt.data.results || mt.data);
      setPackSizes(ps.data.results || ps.data);
      setPrices(pr.data.results || pr.data);
      setStock(st.data.results || st.data);
    } catch {
      Alert.alert("Error", "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Inventory</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)} style={[s.tabChip, tab === i && s.tabChipActive]}>
            <Text style={[s.tabTxt, tab === i && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 0 && <SetupTab milkTypes={milkTypes} packSizes={packSizes} prices={prices} stock={stock} onRefresh={load} />}
      {tab === 1 && <SuppliersTab />}
      {tab === 2 && <GoodsTab milkTypes={milkTypes} packSizes={packSizes} stock={stock} onRefresh={load} />}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  refreshBtn: { padding: 6 },

  tabScroll: { flexGrow: 0 },
  tabBar: { paddingHorizontal: 12, gap: 6, paddingVertical: 6 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#e5e7eb" },
  tabChipActive: { backgroundColor: colors.primary },
  tabTxt: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  tabTxtActive: { color: "#fff", fontWeight: "700" },

  padded: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" },
  hint: { fontSize: 11, color: "#9ca3af", marginBottom: 8 },
  lbl: { fontSize: 12, fontWeight: "500", color: "#374151", marginTop: 8, marginBottom: 4 },
  empty: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 8 },

  simpleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dot2: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827", marginLeft: 8 },
  meta: { fontSize: 12, color: "#9ca3af" },

  addRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#f9fafb", color: "#111827", fontSize: 14 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 13, alignItems: "center", marginTop: 6 },
  primaryBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Table
  tableHead: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2 },
  thCell: { flex: 1, fontSize: 10, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  tdName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  tdSub: { fontSize: 11, color: "#6b7280" },
  tdCell: { flex: 1, fontSize: 13, color: "#374151" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 12, color: "#6b7280" },
  chipTxtActive: { color: "#fff", fontWeight: "600" },

  threeCol: { flexDirection: "row", gap: 6 },
  twoCol: { flexDirection: "row", gap: 10 },

  // Suppliers
  supRow: { flexDirection: "row", alignItems: "center" },
  supAvatar: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  supAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  supName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  supPhone: { fontSize: 12, color: "#6b7280" },
  owedBadge: { backgroundColor: "#fee2e2", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  owedTxt: { fontSize: 11, fontWeight: "700", color: "#b91c1c" },

  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  billDate: { fontSize: 13, fontWeight: "600", color: "#111827" },
  billNote: { fontSize: 11, color: "#9ca3af" },
  billTotal: { fontSize: 13, fontWeight: "700", color: "#111827" },
  billBalance: { fontSize: 11, fontWeight: "600", color: "#ef4444" },
  billPaid: { fontSize: 11, fontWeight: "600", color: "#16a34a" },

  addLineBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, borderStyle: "dashed", marginTop: 10 },
  addLineTxt: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  lineCard: { backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, marginBottom: 10 },
  lineHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  lineNum: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },

  histCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
  histHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  histSup: { fontSize: 14, fontWeight: "700", color: "#111827" },
  histDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  histLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  histLineTxt: { fontSize: 13, color: "#374151" },
  histLineQty: { fontSize: 13, fontWeight: "700", color: "#16a34a" },

  greenBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  greenBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#166534" },
});

// ── Goods Received table styles ────────────────────────────
const gr = StyleSheet.create({
  topBar: { flexDirection: "row", gap: 10, marginBottom: 12 },
  addProductBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#7c3aed", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  addProductTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  addSupplierBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#d97706", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  addSupplierTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  metaRow: { flexDirection: "row", marginBottom: 12 },

  tableWrap: { borderRadius: 8, marginBottom: 4 },

  // Column widths
  colAction: { width: 48, alignItems: "center", justifyContent: "center" },
  colSN: { width: 40, alignItems: "center" },
  colProduct: { width: 140 },
  colPrice: { width: 90 },
  colQty: { width: 80 },
  colExpiry: { width: 110 },
  colTotal: { width: 90 },

  thead: { flexDirection: "row", backgroundColor: "#374151", paddingVertical: 10 },
  th: { fontSize: 11, fontWeight: "700", color: "#fff", paddingHorizontal: 6, textAlignVertical: "center" },

  trow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", minHeight: 52, alignItems: "center" },
  trowAlt: { backgroundColor: "#f9fafb" },
  td: { paddingHorizontal: 6, justifyContent: "center" },

  snTxt: { fontSize: 13, fontWeight: "700", color: "#374151", textAlign: "center" },
  productTxt: { fontSize: 13, fontWeight: "700", color: "#111827" },
  productPlaceholder: { fontSize: 12, color: "#9ca3af" },
  packTxt: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  cellInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, padding: 6, backgroundColor: "#fff", fontSize: 13, color: "#111827", width: "100%" },
  totalTxt: { fontSize: 13, fontWeight: "700", color: "#111827" },

  totalRow: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 10, borderTopWidth: 2, borderTopColor: "#e5e7eb" },
});
