import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface Props {
  onClose: () => void;
}

export default function LoginModal({ onClose }: Props) {
  const { colors } = useTheme();
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        if (!email.trim()) { setError("Email is required"); setLoading(false); return; }
        await register(username, email, password);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", background: colors.bgHover, border: `1px solid ${colors.borderBase}`,
    borderRadius: 4, padding: "8px 10px", fontSize: "0.85rem",
    color: colors.textPrimary, outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="card flex flex-col"
        style={{ width: 360, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Logo / title */}
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>
          Wild<span style={{ color: colors.logoAccent, fontWeight: 400 }}>chat</span> Lens
        </div>
        <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: 20 }}>
          Sign in to save personal annotations
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5">
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              className={`filter-btn flex-1 ${tab === t ? "active" : ""}`}
              onClick={() => { setTab(t); setError(""); }}
            >
              {t === "login" ? "Log in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Username
            </label>
            <input
              style={inputStyle}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          {tab === "register" && (
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Email
              </label>
              <input
                type="email"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          {error && (
            <div style={{ fontSize: "0.75rem", color: "#ef4444", padding: "6px 8px", background: "#ef444418", borderRadius: 4 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="filter-btn active"
            style={{ marginTop: 4, padding: "9px", fontSize: "0.85rem", fontWeight: 600, justifyContent: "center", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
