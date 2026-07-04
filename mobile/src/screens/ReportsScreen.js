import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme";

const REPORT_TABS = [
  { key: "sales", label: "Milk Sales" },
  { key: "product-sales", label: "Product Sales" },
  { key: "debt", label: "Debt" },
  { key: "paper-bags", label: "Paper Bags" },
  { key: "suppliers", label: "Suppliers" },
  { key: "bottles", label: "Bottles" },
];

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

// ── Collapsible section ────────────────────────────────────
function Section({ emoji, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={styles.sectionHeaderText}>{emoji}  {title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// ── Shared helpers ─────────────────────────────────────────
function StatGrid({ children }) {
  return <View style={styles.statsRow}>{children}</View>;
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Empty({ text = "No records for this period." }) {
  return <Text style={styles.empty}>{text}</Text>;
}

// ── Aggregated milk sales ──────────────────────────────────
function SalesReport({ data }) {
  return (
    <>
      <Section emoji="📦" title="Summary">
        <StatGrid>
          <StatCard label="Total" value={`KES ${data.total_sales}`} />
          <StatCard label="Orders" value={data.order_count} />
        </StatGrid>
      </Section>
      <Section emoji="📋" title="Breakdown" defaultOpen={false}>
        {(data.by_item || []).length === 0 ? (
          <Empty />
        ) : (
          data.by_item.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle}>{r.milk_type__name} · {r.pack_size__label}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowMeta}>Qty {r.total_quantity}</Text>
                <Text style={styles.rowAmount}>KES {r.total_revenue}</Text>
              </View>
            </View>
          ))
        )}
      </Section>
    </>
  );
}

// ── Product sales list ─────────────────────────────────────
function ProductSalesReport({ period }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/sales/product-sales/?page_size=100&period=${period}`)
      .then(({ data }) => setSales(data.results || data))
      .catch(() => setError("Failed to load product sales."))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;
  if (!sales.length) return <Empty text="No product sales recorded yet." />;

  const totalRevenue = sales.reduce((s, x) => s + parseFloat(x.total_amount), 0);
  const paid = sales.filter((x) => x.payment_status === "PAID").length;
  const unpaid = sales.filter((x) => x.payment_status === "UNPAID").length;

  return (
    <>
      <Section emoji="💰" title="Overview">
        <StatGrid>
          <StatCard label="Revenue" value={`KES ${totalRevenue.toFixed(2)}`} />
          <StatCard label="Paid" value={paid} />
          <StatCard label="On Bill" value={unpaid} />
        </StatGrid>
      </Section>
      <Section emoji="🧾" title="Sales" defaultOpen={false}>
        {sales.map((s) => (
          <TouchableOpacity key={s.id} onPress={() => setExpanded(expanded === s.id ? null : s.id)}>
            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleName}>{s.customer_name || "Walk-in"}</Text>
                  <Text style={styles.saleMeta}>{new Date(s.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.saleAmount}>KES {parseFloat(s.total_amount).toFixed(2)}</Text>
                  <View style={[styles.statusBadge, s.payment_status === "PAID" ? styles.badgePaid : styles.badgeUnpaid]}>
                    <Text style={[styles.statusText, s.payment_status === "PAID" ? styles.statusPaid : styles.statusUnpaid]}>
                      {s.payment_status === "PAID" ? "Paid" : "On Bill"}
                    </Text>
                  </View>
                </View>
                <Ionicons name={expanded === s.id ? "chevron-up" : "chevron-down"} size={14} color="#9ca3af" style={{ marginLeft: 8 }} />
              </View>
              {expanded === s.id && (
                <View style={styles.itemsSection}>
                  {(s.items || []).map((it, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName}>{it.product_name}</Text>
                      <Text style={styles.itemQty}>{it.quantity} × KES {it.unit_price}</Text>
                      <Text style={styles.itemTotal}>KES {it.line_total}</Text>
                    </View>
                  ))}
                  <View style={styles.paymentRow}>
                    <Ionicons name="card-outline" size={12} color="#9ca3af" />
                    <Text style={styles.paymentMethodText}>{s.payment_method}</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </Section>
    </>
  );
}

// ── Debt ───────────────────────────────────────────────────
function DebtReport({ data }) {
  const total = parseFloat(data.total_debt || 0).toFixed(2);
  return (
    <>
      <Section emoji="💳" title="Overview">
        <StatGrid>
          <StatCard label="Total Debt" value={`KES ${total}`} />
        </StatGrid>
      </Section>
      <Section emoji="👥" title="Customers" defaultOpen={false}>
        {!(data.customers || []).length ? (
          <Empty text="No customers with outstanding debt." />
        ) : (
          data.customers.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowMeta}>{c.phone_number}</Text>
                <Text style={[styles.rowAmount, { color: "#dc2626" }]}>KES {c.debt_balance}</Text>
              </View>
            </View>
          ))
        )}
      </Section>
    </>
  );
}

// ── Paper Bags ────────────────────────────────────────────
function PaperBagsReport({ data }) {
  return (
    <>
      <Section emoji="📊" title="Overview">
        <StatGrid>
          <StatCard label="Bought" value={data.bought} />
          <StatCard label="Used" value={data.used} />
        </StatGrid>
      </Section>
      <Section emoji="📦" title="Stock" defaultOpen={false}>
        {(data.remaining || []).map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowTitle}>{r.label}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowMeta}>{r.quantity} remaining</Text>
              {r.is_low && <Text style={styles.lowText}>LOW</Text>}
            </View>
          </View>
        ))}
      </Section>
    </>
  );
}

// ── Suppliers ─────────────────────────────────────────────
function SuppliersReport({ data }) {
  return (
    <>
      <Section emoji="💰" title="Cost">
        <StatGrid>
          <StatCard label="Total Cost" value={`KES ${data.total_cost}`} />
        </StatGrid>
      </Section>
      <Section emoji="🏢" title="By Supplier" defaultOpen={false}>
        {!(data.by_supplier || []).length ? (
          <Empty />
        ) : (
          data.by_supplier.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle}>{r.supplier__name} · {r.kind}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowMeta}>Qty {r.total_quantity}</Text>
                <Text style={styles.rowAmount}>KES {r.total_cost}</Text>
              </View>
            </View>
          ))
        )}
      </Section>
    </>
  );
}

// ── Bottles ───────────────────────────────────────────────
function BottlesReport({ data }) {
  return (
    <>
      <Section emoji="🍼" title="Overview">
        <StatGrid>
          <StatCard label="Total Out" value={data.total_bottles_out} />
        </StatGrid>
      </Section>
      <Section emoji="👤" title="Customers" defaultOpen={false}>
        {!(data.customers || []).length ? (
          <Empty text="No bottles outstanding." />
        ) : (
          data.customers.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowAmount}>{c.bottles_out} bottles</Text>
            </View>
          ))
        )}
      </Section>
    </>
  );
}

const AGGREGATED_REPORTS = {
  sales: SalesReport,
  debt: DebtReport,
  "paper-bags": PaperBagsReport,
  suppliers: SuppliersReport,
  bottles: BottlesReport,
};

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState(null);
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async (key, p) => {
    if (key === "product-sales") return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data } = await api.get(`/reports/${key}/?period=${p}`);
      setData(data);
    } catch {
      setError("Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (key) => {
    setActiveTab(key);
    fetchReport(key, period);
  };

  const selectPeriod = (p) => {
    setPeriod(p);
    if (activeTab && activeTab !== "product-sales") {
      fetchReport(activeTab, p);
    }
  };

  const ReportView = activeTab && AGGREGATED_REPORTS[activeTab];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reports</Text>

      {/* Period filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => selectPeriod(p.key)}
          >
            <Text style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
        {REPORT_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => selectTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!activeTab && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={36} color="#d1d5db" />
          <Text style={[styles.emptyText, { marginTop: 8 }]}>Select a report above</Text>
        </View>
      )}

      {activeTab === "product-sales" ? (
        <ProductSalesReport period={period} />
      ) : (
        <View style={styles.resultBox}>
          {loading && <ActivityIndicator color={colors.primary} />}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!loading && !error && data && ReportView && <ReportView data={data} />}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },

  periodChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  periodChipActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  periodChipText: { fontSize: 12, color: colors.text, fontWeight: "500" },
  periodChipTextActive: { color: "#fff", fontWeight: "700" },

  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, color: colors.text, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  resultBox: { marginBottom: 24 },

  // Collapsible section
  section: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "#f3f4f6" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fafafa", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  sectionHeaderText: { fontSize: 13, fontWeight: "700", color: colors.text },
  sectionBody: { padding: 12 },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.text },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowTitle: { fontSize: 13, fontWeight: "500", color: colors.text, flex: 1 },
  rowRight: { alignItems: "flex-end" },
  rowMeta: { fontSize: 11, color: colors.textSecondary },
  rowAmount: { fontSize: 14, fontWeight: "700", color: colors.text },
  lowText: { fontSize: 10, fontWeight: "700", color: "#dc2626" },

  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 8 },
  emptyState: { alignItems: "center", paddingTop: 32 },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center", padding: 12 },

  // Product sales cards
  saleCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  saleHeader: { flexDirection: "row", alignItems: "center" },
  saleName: { fontSize: 14, fontWeight: "700", color: colors.text },
  saleMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 4 },
  statusBadge: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8, alignSelf: "flex-end" },
  badgePaid: { backgroundColor: "#dcfce7" },
  badgeUnpaid: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusPaid: { color: "#16a34a" },
  statusUnpaid: { color: "#92400e" },
  itemsSection: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  itemName: { flex: 1, fontSize: 12, color: colors.text },
  itemQty: { fontSize: 11, color: colors.textSecondary, marginHorizontal: 8 },
  itemTotal: { fontSize: 12, fontWeight: "600", color: colors.text },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  paymentMethodText: { fontSize: 11, color: colors.textSecondary },
});
