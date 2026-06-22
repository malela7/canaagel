import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import POSScreen from "./src/screens/POSScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import DeliveryScreen from "./src/screens/DeliveryScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import SuperAdminHomeScreen from "./src/screens/SuperAdminHomeScreen";
import ShopsScreen from "./src/screens/ShopsScreen";
import SuperAdminReportsScreen from "./src/screens/SuperAdminReportsScreen";
import SuperAdminSettingsScreen from "./src/screens/SuperAdminSettingsScreen";

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

const TAB_ICONS = {
  POS: "cart-outline",
  Customers: "people-outline",
  Delivery: "bicycle-outline",
  Reports: "bar-chart-outline",
  Home: "home-outline",
  Shops: "storefront-outline",
  Settings: "settings-outline",
};

function tabIcon({ route, color, size }) {
  return <Ionicons name={TAB_ICONS[route.name] || "ellipse-outline"} size={size} color={color} />;
}

function OwnerEmployeeStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: "#16a34a",
        tabBarIcon: (props) => tabIcon({ route, ...props }),
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} options={{ title: "Point of Sale" }} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Delivery" component={DeliveryScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

function SuperAdminStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: (props) => tabIcon({ route, ...props }),
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
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
