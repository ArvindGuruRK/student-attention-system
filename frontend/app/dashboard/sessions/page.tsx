"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { api, type Session, type Classroom } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

export default function SessionsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const cls = await api.classrooms.list();
        setClassrooms(cls);
        const all = await Promise.all(cls.map((c) => api.sessions.list(c.id)));
        setSessions(
          all.flat().sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-3xl">
        <div className="skeleton h-8 w-44 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl animate-fadeIn">
        <h1 className="page-title mb-4">Session History</h1>
        <div className="card p-5">
          <p className="text-sm text-[#525252]">{error}</p>
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => !s.ended_at);
  const pastSessions = sessions.filter((s) => !!s.ended_at);

  return (
    <div className="max-w-3xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="page-title">Session History</h1>
        <p className="text-sm text-[#737373] mt-1">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} across {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="section-title">Live Now</span>
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
            </span>
          </div>
          <div className="card divide-y divide-[#f5f5f5]">
            {activeSessions.map((s, i) => (
              <SessionRow
                key={s.id}
                session={s}
                classroomName={classrooms.find((c) => c.id === s.classroom_id)?.name}
                delay={i * 30}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <section>
          <div className="mb-3">
            <span className="section-title">Past Sessions</span>
          </div>
          <div className="card divide-y divide-[#f5f5f5]">
            {pastSessions.map((s, i) => (
              <SessionRow
                key={s.id}
                session={s}
                classroomName={classrooms.find((c) => c.id === s.classroom_id)?.name}
                delay={i * 20}
              />
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={22} strokeWidth={1.5} className="text-[#a3a3a3]" />
          </div>
          <p className="text-sm font-semibold text-[#0a0a0a] mb-1">No sessions yet</p>
          <p className="text-xs text-[#a3a3a3] mb-5">Start a session from a classroom to begin monitoring</p>
          <Link href="/dashboard/classrooms" className="btn-primary text-xs px-5 py-2.5">
            Go to Classrooms
          </Link>
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  classroomName,
  delay,
}: {
  session: Session;
  classroomName?: string;
  delay: number;
}) {
  const isLive = !session.ended_at;
  const duration = session.ended_at
    ? formatDuration((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;

  const startDate = new Date(session.started_at);

  return (
    <div
      className="flex items-center justify-between px-6 py-4 group animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {isLive ? (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5] shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0a0a0a] truncate">
            {session.classroom_name ?? classroomName ?? "Unknown classroom"}
          </p>
          <p className="text-[11px] text-[#a3a3a3] mt-0.5">
            {startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {duration && <> · {duration}</>}
          </p>
        </div>
      </div>

      <Link
        href={isLive ? `/dashboard/sessions/${session.id}/live` : `/dashboard/sessions/${session.id}/report`}
        className="text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors shrink-0 ml-4"
      >
        {isLive ? "Open Live →" : "Report →"}
      </Link>
    </div>
  );
}
