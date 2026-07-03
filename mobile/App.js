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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
  Products: "cube-outline",
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

const Stack2 = createNativeStackNavigator();

function RetailStack() {
  const { user } = useAuth();
  const { accent } = useTheme();
  const isOwner = user?.role === "OWNER";

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
      <Tab.Screen name="Profile">
        {(props) => (
          <Stack2.Navigator>
            <Stack2.Screen
              name="ProfileMain"
              options={{ title: "Profile", headerRight: () => <LogoutButton /> }}
            >
              {(innerProps) => (
                <RetailProfileScreen
                  {...innerProps}
                  navigation={{ ...innerProps.navigation, navigate: (name) => props.navigation.getParent()?.navigate(name) ?? innerProps.navigation.navigate(name) }}
                />
              )}
            </Stack2.Screen>
            <Stack2.Screen name="Customers" component={CustomersScreen} />
            <Stack2.Screen name="Products" component={ProductsScreen} />
            <Stack2.Screen name="Expenses" component={ExpensesScreen} />
            <Stack2.Screen name="StockOrders" component={StockOrdersScreen} options={{ title: "Stock Orders" }} />
            {isOwner && <Stack2.Screen name="Employees" component={EmployeesScreen} />}
            {isOwner && <Stack2.Screen name="Subscription" component={SubscriptionScreen} />}
          </Stack2.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function MilkStack() {
  const { accent } = useTheme();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: accent,
        tabBarIcon: (props) => ownerTabIcon({ route, ...props }),
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} options={{ title: "Point of Sale" }} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      {isOwner && <Tab.Screen name="Employees" component={EmployeesScreen} />}
      {isOwner && <Tab.Screen name="Subscription" component={SubscriptionScreen} />}
      <Tab.Screen name="Reports" component={ReportsScreen} />
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
