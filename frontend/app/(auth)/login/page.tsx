"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, AlertCircle, Loader2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

type Tab = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      saveAuth(res.access_token, { teacher_id: res.teacher_id, name: res.name });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }
    if (regPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await api.auth.register(regEmail, regPassword, regName);
      saveAuth(res.access_token, { teacher_id: res.teacher_id, name: res.name });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) { setTab(t); setError(""); }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0a0a0a] flex-col justify-between p-12 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 border border-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 border border-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-px h-48 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Eye size={15} strokeWidth={2} className="text-[#0a0a0a]" />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">Attend</span>
          </div>

          <h1 className="text-white font-semibold text-5xl leading-[1.05] tracking-tight mb-6">
            Classroom<br />intelligence,<br />in real&nbsp;time.
          </h1>
          <p className="text-white/50 text-base leading-relaxed font-normal max-w-xs">
            Monitor student attention live. Catch disengagement early. Make every minute of teaching count.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            "Real-time attention scoring via AI",
            "Instant alerts when students disengage",
            "Post-session analytics & PDF reports",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                <Check size={10} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="text-white/60 text-sm font-normal">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm animate-fadeIn">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-7 h-7 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
              <Eye size={13} strokeWidth={2} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#0a0a0a]">Attend</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight mb-1">
              {tab === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-[#737373] text-sm">
              {tab === "login"
                ? "Sign in to your teacher account."
                : "Register to start monitoring your classroom."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#f5f5f5] rounded-xl p-1 mb-8">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                  tab === t ? "bg-white text-[#0a0a0a] shadow-subtle" : "text-[#737373] hover:text-[#525252]"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="input" placeholder="Enter your email address" required autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className="input" placeholder="Enter your password" required />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-[#0a0a0a] bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl px-4 py-3">
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={regName} onChange={(e) => { setRegName(e.target.value); setError(""); }} className="input" placeholder="Enter your full name" required autoFocus />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={regEmail} onChange={(e) => { setRegEmail(e.target.value); setError(""); }} className="input" placeholder="Enter your email address" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={regPassword} onChange={(e) => { setRegPassword(e.target.value); setError(""); }} className="input" placeholder="Enter a password (min. 6 characters)" required />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" value={regConfirm} onChange={(e) => { setRegConfirm(e.target.value); setError(""); }} className="input" placeholder="Re-enter your password" required />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-[#0a0a0a] bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl px-4 py-3">
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
