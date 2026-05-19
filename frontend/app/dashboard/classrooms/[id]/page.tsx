"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Square, Copy, Check, Loader2, ChevronRight } from "lucide-react";
import { api, type Classroom, type Student, type Session } from "@/lib/api";

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [cls, sts, sess] = await Promise.all([api.classrooms.get(id), api.students.list(id), api.sessions.list(id)]);
        setClassroom(cls); setStudents(sts); setSessions(sess);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classroom");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function removeStudent(studentId: string) {
    try {
      await api.students.delete(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove student");
    }
  }

  async function startSession() {
    setStarting(true); setStartError("");
    try {
      const sess = await api.sessions.start(id);
      setSessions((prev) => [sess, ...prev]);
      router.push(`/dashboard/sessions/${sess.id}/live`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setStarting(false);
    }
  }

  function copyJoinLink() {
    if (joinLink) { navigator.clipboard.writeText(joinLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-3xl">
        <div className="skeleton h-8 w-52 rounded-xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-56 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (error) return <div className="card p-6 max-w-3xl animate-fadeIn"><p className="text-sm text-[#525252]">{error}</p></div>;
  if (!classroom) return null;

  const activeSession = sessions.find((s) => !s.ended_at);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinLink = activeSession ? `${origin}/join/${activeSession.id}` : null;

  return (
    <div className="max-w-3xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/classrooms" className="text-xs text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">Classrooms</Link>
            <ChevronRight size={12} strokeWidth={1.75} className="text-[#d4d4d4]" />
            <span className="text-xs text-[#737373]">{classroom.name}</span>
          </div>
          <h1 className="page-title">{classroom.name}</h1>
        </div>

        {activeSession ? (
          <Link href={`/dashboard/sessions/${activeSession.id}/live`} className="btn-primary shrink-0 text-xs px-4 py-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Live Session
          </Link>
        ) : (
          <button onClick={startSession} disabled={starting} className="btn-primary shrink-0 text-xs px-4 py-2.5">
            {starting ? <><Loader2 size={13} className="animate-spin" /> Starting…</> : <><Play size={13} strokeWidth={2} /> Start Session</>}
          </button>
        )}
      </div>

      {startError && <div className="card p-4"><p className="text-sm text-[#525252]">{startError}</p></div>}

      {/* Join link */}
      {joinLink && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
            </span>
            <p className="text-xs font-semibold text-[#0a0a0a] uppercase tracking-wider">Session Active — Share Link</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#f7f7f7] border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-xs text-[#525252] break-all font-mono">{joinLink}</code>
            <button onClick={copyJoinLink} className={`btn-primary shrink-0 text-xs px-4 py-2.5 ${copied ? "bg-[#404040]" : ""}`}>
              {copied ? <><Check size={12} strokeWidth={2.5} /> Copied</> : <><Copy size={12} strokeWidth={2} /> Copy</>}
            </button>
          </div>
          <p className="text-[11px] text-[#a3a3a3] mt-2">Students visit this link, enter their name, and join the monitoring session.</p>
        </div>
      )}

      {/* Students */}
      <section className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <span className="section-title">Students</span>
          <span className="text-xs text-[#a3a3a3] tabular-nums">{students.length}</span>
        </div>
        {students.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-sm text-[#a3a3a3] leading-relaxed">No students yet. Start a session and share the join link — students register themselves.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3.5 group animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#f5f5f5] rounded-lg flex items-center justify-center text-xs font-semibold text-[#737373]">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#0a0a0a]">{s.name}</span>
                </div>
                <button onClick={() => removeStudent(s.id)} className="text-[11px] text-[#d4d4d4] hover:text-[#0a0a0a] opacity-0 group-hover:opacity-100 transition-all font-medium">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Session History */}
      <section className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <span className="section-title">Session History</span>
          <span className="text-xs text-[#a3a3a3] tabular-nums">{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <div className="py-12 px-6 text-center"><p className="text-sm text-[#a3a3a3]">No sessions yet.</p></div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {sessions.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3.5 animate-in" style={{ animationDelay: `${i * 25}ms` }}>
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">
                    {new Date(s.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                    {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {s.ended_at && <> → {new Date(s.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!s.ended_at && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
                    </span>
                  )}
                  <Link href={s.ended_at ? `/dashboard/sessions/${s.id}/report` : `/dashboard/sessions/${s.id}/live`} className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors">
                    {s.ended_at ? "Report →" : "Live →"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
