import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme";

const STORAGE_KEY = "accentColor";

export const ACCENT_OPTIONS = [
  { key: "orange", label: "Orange", value: colors.primary, dark: colors.primaryDark },
  { key: "green", label: "Green", value: "#16a34a", dark: "#15803d" },
  { key: "blue", label: "Blue", value: "#2563eb", dark: "#1d4ed8" },
  { key: "purple", label: "Purple", value: "#7c3aed", dark: "#6d28d9" },
  { key: "rose", label: "Rose", value: "#e11d48", dark: "#be123c" },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [accentKey, setAccentKey] = useState("orange");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && ACCENT_OPTIONS.some((o) => o.key === stored)) setAccentKey(stored);
      setLoaded(true);
    })();
  }, []);

  const setAccent = async (key) => {
    setAccentKey(key);
    await AsyncStorage.setItem(STORAGE_KEY, key);
  };

  const accent = ACCENT_OPTIONS.find((o) => o.key === accentKey) || ACCENT_OPTIONS[0];

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ accent, accentKey, setAccent, options: ACCENT_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
