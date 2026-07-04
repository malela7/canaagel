import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import POSScreen from "./src/screens/POSScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import DeliveryScreen from "./src/screens/DeliveryScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import EmployeesScreen from "./src/screens/EmployeesScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import ExpensesScreen from "./src/screens/ExpensesScreen";
import StockOrdersScreen from "./src/screens/StockOrdersScreen";
import SuperAdminHomeScreen from "./src/screens/SuperAdminHomeScreen";
import ShopsScreen from "./src/screens/ShopsScreen";
import SuperAdminReportsScreen from "./src/screens/SuperAdminReportsScreen";
import SuperAdminSettingsScreen from "./src/screens/SuperAdminSettingsScreen";
import RetailPOSScreen from "./src/screens/RetailPOSScreen";
import RetailHomeScreen from "./src/screens/RetailHomeScreen";
import RetailProfileScreen from "./src/screens/RetailProfileScreen";
import MilkHomeScreen from "./src/screens/MilkHomeScreen";
import MilkProfileScreen from "./src/screens/MilkProfileScreen";
import SalesReportScreen from "./src/screens/SalesReportScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MilkHomeNav = createNativeStackNavigator();

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 12 }}>
      <Text style={{ color: "#dc2626", fontWeight: "600" }}>Logout</Text>
    </TouchableOpacity>
  );
}

const SUPER_ADMIN_ICONS = {
  Home: "home-outline",
  Shops: "storefront-outline",
  Reports: "bar-chart-outline",
  Settings: "settings-outline",
};

const OWNER_ICONS = {
  POS: "cart-outline",
  Customers: "people-outline",
  Delivery: "bicycle-outline",
  Inventory: "layers-outline",
  Expenses: "receipt-outline",
  StockOrders: "file-tray-full-outline",
  Employees: "person-add-outline",
  Subscription: "card-outline",
  Reports: "bar-chart-outline",
  // Retail 4-tab layout
  PlaceOrder: "cart-outline",
  Home: "home-outline",
  Dashboard: "bar-chart-outline",
  Profile: "person-circle-outline",
};

function superAdminTabIcon({ route, color, size }) {
  return <Ionicons name={SUPER_ADMIN_ICONS[route.name] || "ellipse-outline"} size={size} color={color} />;
}

function ownerTabIcon({ route, color, size }) {
  return <Ionicons name={OWNER_ICONS[route.name] || "ellipse-outline"} size={size} color={color} />;
}

const RetailInnerStack = createNativeStackNavigator();

function RetailTabs() {
  const { accent } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopWidth: 1, borderTopColor: "#f3f4f6", height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={OWNER_ICONS[route.name] || "ellipse-outline"} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="PlaceOrder" component={RetailPOSScreen} options={{ title: "Place Order" }} />
      <Tab.Screen name="Home" component={RetailHomeScreen} />
      <Tab.Screen name="Dashboard" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={RetailProfileScreen} />
    </Tab.Navigator>
  );
}

function RetailStack() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  return (
    <RetailInnerStack.Navigator>
      <RetailInnerStack.Screen name="RetailTabs" component={RetailTabs} options={{ headerShown: false }} />
      <RetailInnerStack.Screen name="Customers" component={CustomersScreen} options={{ headerRight: () => <LogoutButton /> }} />
      <RetailInnerStack.Screen name="Products" component={ProductsScreen} options={{ headerRight: () => <LogoutButton /> }} />
      <RetailInnerStack.Screen name="Expenses" component={ExpensesScreen} options={{ headerRight: () => <LogoutButton /> }} />
      <RetailInnerStack.Screen name="StockOrders" component={StockOrdersScreen} options={{ title: "Stock Orders", headerRight: () => <LogoutButton /> }} />
      {isOwner && <RetailInnerStack.Screen name="Employees" component={EmployeesScreen} options={{ headerRight: () => <LogoutButton /> }} />}
      {isOwner && <RetailInnerStack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerRight: () => <LogoutButton /> }} />}
    </RetailInnerStack.Navigator>
  );
}

function MilkHomeStack() {
  return (
    <MilkHomeNav.Navigator screenOptions={{ headerShown: false }}>
      <MilkHomeNav.Screen name="MilkHomeMain" component={MilkHomeScreen} />
      <MilkHomeNav.Screen name="Inventory" component={InventoryScreen} options={{ headerShown: true, title: "Inventory" }} />
      <MilkHomeNav.Screen name="Expenses" component={ExpensesScreen} options={{ headerShown: true, title: "Expenses" }} />
      <MilkHomeNav.Screen name="Customers" component={CustomersScreen} options={{ headerShown: true, title: "Customers" }} />
      <MilkHomeNav.Screen name="Employees" component={EmployeesScreen} options={{ headerShown: true, title: "Employees" }} />
      <MilkHomeNav.Screen name="Supplier" component={InventoryScreen} options={{ headerShown: true, title: "Suppliers", initialParams: { initialTab: "suppliers" } }} />
      <MilkHomeNav.Screen name="SalesReport" component={SalesReportScreen} options={{ headerShown: true, title: "Sell Report" }} />
    </MilkHomeNav.Navigator>
  );
}

function MilkStack() {
  const { accent } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopWidth: 1, borderTopColor: "#f3f4f6", height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      }}
    >
      <Tab.Screen name="POS" component={POSScreen}
        options={{ title: "Point of Sell", tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />, headerShown: true, headerTitle: "Point of Sale", headerRight: () => <LogoutButton /> }} />
      <Tab.Screen name="Home" component={MilkHomeStack}
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Dashboard" component={ReportsScreen}
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />, headerShown: true, headerTitle: "Dashboard", headerRight: () => <LogoutButton /> }} />
      <Tab.Screen name="Profile" component={MilkProfileScreen}
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />, headerShown: true, headerTitle: "Profile", headerRight: () => <LogoutButton /> }} />
    </Tab.Navigator>
  );
}

function OwnerEmployeeStack() {
  const { user } = useAuth();
  const shopType = user?.shop_type || "MILK";
  return shopType === "GENERAL" ? <RetailStack /> : <MilkStack />;
}

function SuperAdminStack() {
  const { accent } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: accent.value,
        tabBarIcon: (props) => superAdminTabIcon({ route, ...props }),
      })}
    >
      <Tab.Screen name="Home" component={SuperAdminHomeScreen} />
      <Tab.Screen name="Shops" component={ShopsScreen} />
      <Tab.Screen name="Reports" component={SuperAdminReportsScreen} />
      <Tab.Screen name="Settings" component={SuperAdminSettingsScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { user } = useAuth();
  return user?.role === "SUPER_ADMIN" ? <SuperAdminStack /> : <OwnerEmployeeStack />;
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Main" component={MainStack} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot password" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
