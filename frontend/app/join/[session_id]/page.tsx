"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, Video, Shield, ArrowRight, Loader2, AlertCircle, Wifi } from "lucide-react";
import { api } from "@/lib/api";

export default function JoinSessionPage() {
  const { session_id } = useParams<{ session_id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [classroomName, setClassroomName] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) return;
    api.sessions.getStatus(session_id)
      .then(s => { if (s.classroom_name) setClassroomName(s.classroom_name); })
      .catch(() => {});
  }, [session_id]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!rollNumber.trim()) { setError("Please enter your roll number."); return; }
    setLoading(true);
    try {
      const res = await api.sessions.join(session_id, name.trim(), rollNumber.trim());
      router.push(`/student/${res.session_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join — make sure the session is active.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center p-4">

      {/* Background grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(#0a0a0a 1px, transparent 1px),
            linear-gradient(90deg, #0a0a0a 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main card */}
      <div className="relative w-full max-w-[520px] animate-slideUp">

        {/* Brand header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
              <Eye size={13} strokeWidth={2} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#0a0a0a]">Attend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-[#525252] tracking-wide uppercase">Live</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e8e8e8] rounded-3xl overflow-hidden shadow-card">

          {/* Dark top section */}
          <div className="bg-[#0a0a0a] px-8 pt-6 pb-5 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 border border-white/5 rounded-full" />
            <div className="absolute -bottom-12 -left-6 w-40 h-40 border border-white/5 rounded-full" />
            <div className="absolute top-4 right-4 w-16 h-16 border border-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-5">
                <Wifi size={10} strokeWidth={2.5} className="text-white/70" />
                <span className="text-[10px] font-semibold text-white/70 tracking-widest uppercase">
                  {classroomName ?? "Live Session"}
                </span>
              </div>

              <h1 className="text-white font-semibold text-2xl tracking-tight leading-snug mb-1.5">
                Join your<br />class session
              </h1>
              <p className="text-white/50 text-sm leading-relaxed">
                Enter your details below to connect and start attention monitoring.
              </p>
            </div>
          </div>

          {/* Form section */}
          <div className="px-8 py-5">
            <form onSubmit={handleJoin} className="space-y-5">
              {/* Name field */}
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    placeholder="e.g. Ravi Kumar"
                    className="input pr-10"
                    required
                    autoFocus
                    autoComplete="name"
                  />
                  {name && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Roll number field */}
              <div>
                <label className="label">Roll Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => { setRollNumber(e.target.value); setError(""); }}
                    placeholder="e.g. CS2024-001"
                    className="input pr-10"
                    required
                    autoComplete="off"
                  />
                  {rollNumber && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 text-sm text-[#0a0a0a] bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl px-4 py-3 animate-in">
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name.trim() || !rollNumber.trim()}
                className="btn-primary w-full py-3.5 text-[15px] mt-1 group"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Joining session…
                  </>
                ) : (
                  <>
                    Join Session
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#f0f0f0]" />
              <span className="text-[10px] font-semibold text-[#c8c8c8] uppercase tracking-widest">Privacy</span>
              <div className="flex-1 h-px bg-[#f0f0f0]" />
            </div>

            {/* Privacy badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2.5 bg-[#fafafa] border border-[#f0f0f0] rounded-xl px-3 py-2.5">
                <Video size={12} strokeWidth={2} className="text-[#a3a3a3] mt-0.5 shrink-0" />
                <span className="text-[11px] text-[#737373] leading-snug">No video transmitted</span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#fafafa] border border-[#f0f0f0] rounded-xl px-3 py-2.5">
                <Shield size={12} strokeWidth={2} className="text-[#a3a3a3] mt-0.5 shrink-0" />
                <span className="text-[11px] text-[#737373] leading-snug">Data stays on-device</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#b8b8b8] mt-5 tracking-wide">
          Powered by Attend · Real-time classroom intelligence
        </p>
      </div>
    </div>
  );
}
