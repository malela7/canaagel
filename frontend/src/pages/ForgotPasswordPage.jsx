import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
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

  const confirmReset = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", { username, code, new_password: newPassword });
      setMessage("Password reset successfully. You can now sign in.");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setError("Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-green-700 mb-6 text-center">Forgot password</h1>

        {message && <div className="mb-4 text-green-700 text-sm">{message}</div>}
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

        {step === 1 ? (
          <form onSubmit={requestCode}>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              className="w-full border rounded px-3 py-2 mb-6"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 text-white rounded py-2 font-semibold disabled:opacity-50">
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmReset}>
            <label className="block text-sm font-medium mb-1">Reset code</label>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-6"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 text-white rounded py-2 font-semibold disabled:opacity-50">
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-blue-600">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
