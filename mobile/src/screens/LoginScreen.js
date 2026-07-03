import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch {
      setError("Invalid username / email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={styles.container}
      importantForAutofill="yes"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="water" size={28} color="#fff" />
      </View>
      <Text style={styles.title}>Canolee</Text>
      <Text style={styles.subtitle}>Shop Management Platform</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Username or Email</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.fieldIcon} />
        <TextInput
          style={[styles.input, styles.fieldInput]}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          importantForAutofill="yes"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="username or email@example.com"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.fieldIcon} />
        <TextInput
          ref={passwordRef}
          style={[styles.input, styles.fieldInput, styles.passwordInput]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          importantForAutofill="yes"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotLink}>
        <Text style={styles.forgotLinkText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.iconBg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "bold", color: colors.primaryDark, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.primary, textAlign: "center", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4, marginTop: 8 },
  fieldWrap: { position: "relative", justifyContent: "center" },
  fieldIcon: { position: "absolute", left: 10, zIndex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, backgroundColor: "#fff", color: colors.text },
  fieldInput: { paddingLeft: 36 },
  passwordInput: { paddingRight: 40 },
  eyeButton: { position: "absolute", right: 10, height: "100%", justifyContent: "center" },
  button: { backgroundColor: colors.primary, borderRadius: 6, padding: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  forgotLink: { alignItems: "flex-end", marginTop: 8 },
  forgotLinkText: { color: "#2563eb", fontSize: 13 },
});
