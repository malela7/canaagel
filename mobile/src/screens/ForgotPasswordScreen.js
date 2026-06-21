import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import api from "../api/client";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password-reset/request/", { username });
      setMessage("If that account exists, a reset code has been sent by SMS.");
      setStep(2);
    } catch {
      setError("Could not send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", { username, code, new_password: newPassword });
      setMessage("Password reset successfully. You can now sign in.");
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      setError("Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot password</Text>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 1 ? (
        <>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TouchableOpacity style={styles.button} onPress={requestCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Reset code</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="numeric" />
          <Text style={styles.label}>New password</Text>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={confirmReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
        <Text style={styles.backLinkText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f9fafb" },
  title: { fontSize: 24, fontWeight: "bold", color: "#15803d", textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10, backgroundColor: "#fff", color: "#111827" },
  button: { backgroundColor: "#16a34a", borderRadius: 6, padding: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626", marginBottom: 12, textAlign: "center" },
  success: { color: "#166534", marginBottom: 12, textAlign: "center" },
  backLink: { marginTop: 16, alignItems: "center" },
  backLinkText: { color: "#2563eb", fontSize: 13 },
});
