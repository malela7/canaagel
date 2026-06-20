import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import POSScreen from "./src/screens/POSScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import DeliveryScreen from "./src/screens/DeliveryScreen";
import ReportsScreen from "./src/screens/ReportsScreen";

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

function MainStack() {
  return (
    <Tab.Navigator screenOptions={{ headerRight: () => <LogoutButton />, tabBarActiveTintColor: "#16a34a" }}>
      <Tab.Screen name="POS" component={POSScreen} options={{ title: "Point of Sale" }} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Delivery" component={DeliveryScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
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
