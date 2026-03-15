import { useState, useEffect } from "react";
import { validateAadhaar, maskAadhaar } from "./aadhaarValidator";

const SESSION_KEY = "paropkar_aadhaar_session";

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const inputStyle = {
  width: "100%", padding: "13px 16px", borderRadius: 10,
  background: "rgba(30,41,59,0.9)", border: "1px solid rgba(148,163,184,0.2)",
  color: "#e2e8f0", fontSize: 15, boxSizing: "border-box", outline: "none",
};
const labelStyle = {
  display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 700,
  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
};

function PrimaryBtn({ children, onClick, disabled, fullWidth }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: fullWidth ? "100%" : "auto", padding: "13px 20px", borderRadius: 10,
      border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14,
      fontWeight: 700, background: disabled ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
      color: "#fff", opacity: disabled ? 0.6 : 1, transition: "opacity 0.2s",
    }}>{children}</button>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      marginTop: 14, padding: "11px 14px", borderRadius: 10,
      border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
      color: "#f87171", fontSize: 13, fontWeight: 600,
    }}>{msg}</div>
  );
}

export default function AuthPage({ setAuthState }) {
  const [aadhaar, setAadhaar] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    setError("");
    const result = validateAadhaar(aadhaar);
    if (!result.valid) { setError(result.error || "Invalid Aadhaar number."); return; }
    // Store masked session locally
    localStorage.setItem(SESSION_KEY, JSON.stringify({ masked: maskAadhaar(aadhaar), ts: Date.now() }));
    setAuthState("authenticated");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0b1120",
      backgroundImage: "radial-gradient(ellipse at 15% 15%, rgba(59,130,246,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(16,185,129,0.05) 0%, transparent 50%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, justifyContent: "center" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: "linear-gradient(135deg,#3b82f6,#10b981)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🤝</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, lineHeight: 1, color: "#e2e8f0" }}>
              Paropkar AI
            </div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1, textTransform: "uppercase" }}>
              Certificate Intelligence
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          opacity: visible ? 1 : 0, transition: "opacity 0.2s ease",
          background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.12)",
          borderRadius: 18, padding: "32px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🪪</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
              Aadhaar Sign In
            </h2>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              Enter your 12-digit Aadhaar number to continue.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Aadhaar Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="Enter 12-digit Aadhaar"
              style={{ ...inputStyle, letterSpacing: 3, fontSize: 18, textAlign: "center" }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: "#475569", textAlign: "center" }}>
              Only the last 4 digits are stored locally
            </div>
          </div>

          <PrimaryBtn onClick={handleSubmit} fullWidth>
            Continue →
          </PrimaryBtn>
          <ErrorBox msg={error} />

          <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
              🔒 Your Aadhaar is validated locally using the Verhoeff checksum. No data is sent to any server.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
