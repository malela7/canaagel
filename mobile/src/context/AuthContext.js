import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const access = await AsyncStorage.getItem("access");
      if (access) {
        await loadUser();
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    await AsyncStorage.setItem("access", data.access);
    await AsyncStorage.setItem("refresh", data.refresh);
    await loadUser();
  };

  const logout = async () => {
    const refresh = await AsyncStorage.getItem("refresh");
    try {
      await api.post("/auth/logout/", { refresh });
    } catch {
      // ignore
    }
    await AsyncStorage.multiRemove(["access", "refresh"]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
