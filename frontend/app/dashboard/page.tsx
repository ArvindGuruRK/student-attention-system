"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { School, ArrowRight } from "lucide-react";
import { api, type Classroom, type Session } from "@/lib/api";
import { getTeacher } from "@/lib/auth";

export default function DashboardPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const teacher = getTeacher();

  useEffect(() => {
    async function load() {
      try {
        const cls = await api.classrooms.list();
        setClassrooms(cls);
        const sessionResults = await Promise.all(
          cls.map((c) => api.sessions.list(c.id).then((s) => s.filter((x) => !x.ended_at))),
        );
        setActiveSessions(sessionResults.flat());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <div className="card p-6 animate-fadeIn"><p className="text-sm text-[#525252]">{error}</p></div>;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="page-title">
          {greeting}{teacher?.name ? `, ${teacher.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-[#737373] mt-1">
          {activeSessions.length > 0
            ? `${activeSessions.length} active session${activeSessions.length > 1 ? "s" : ""} running right now`
            : "No active sessions — start one from a classroom"}
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Classrooms"  value={classrooms.length}      sub="configured spaces"          href="/dashboard/classrooms" />
        <SummaryCard label="Live Now"    value={activeSessions.length}  sub="active sessions"            live={activeSessions.length > 0} />
        <SummaryCard label="Students"    value={0}                      sub="enrolled across classrooms" />
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="section-title">Live Sessions</span>
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
            </span>
          </div>
          <div className="space-y-3">
            {activeSessions.map((s, i) => (
              <div key={s.id} className="card p-5 flex items-center justify-between animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div>
                  <p className="font-semibold text-sm text-[#0a0a0a]">
                    {classrooms.find((c) => c.id === s.classroom_id)?.name ?? "Unknown Classroom"}
                  </p>
                  <p className="text-xs text-[#a3a3a3] mt-0.5">
                    Started {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Link href={`/dashboard/sessions/${s.id}/live`} className="btn-primary text-xs px-4 py-2">
                  Open Live <ArrowRight size={12} strokeWidth={2} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Classrooms */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <span className="section-title">Your Classrooms</span>
          <Link href="/dashboard/classrooms" className="text-xs text-[#737373] hover:text-[#0a0a0a] font-medium transition-colors">
            View all →
          </Link>
        </div>

        {classrooms.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <School size={24} strokeWidth={1.5} className="text-[#a3a3a3]" />
            </div>
            <p className="text-sm font-semibold text-[#0a0a0a] mb-1">No classrooms yet</p>
            <p className="text-xs text-[#a3a3a3] mb-5">Create your first classroom to get started</p>
            <Link href="/dashboard/classrooms" className="btn-primary text-xs px-5 py-2.5">Create Classroom</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.slice(0, 6).map((c, i) => (
              <Link key={c.id} href={`/dashboard/classrooms/${c.id}`} className="card-hover p-5 block group animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 bg-[#f5f5f5] rounded-xl flex items-center justify-center text-sm font-semibold text-[#525252]">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <ArrowRight size={14} strokeWidth={1.75} className="text-[#d4d4d4] group-hover:text-[#0a0a0a] transition-colors mt-1" />
                </div>
                <p className="font-semibold text-sm text-[#0a0a0a] leading-snug">{c.name}</p>
                <p className="text-xs text-[#a3a3a3] mt-1">Alert &lt;{c.alert_threshold} · Warn &lt;{c.warn_threshold}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, sub, href, live = false }: { label: string; value: number; sub: string; href?: string; live?: boolean }) {
  const content = (
    <>
      <p className="section-title mb-3">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold text-[#0a0a0a] tracking-tight leading-none tabular-nums">{value}</span>
        {live && (
          <span className="relative flex h-2 w-2 mb-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0a0a0a]" />
          </span>
        )}
      </div>
      <p className="text-xs text-[#a3a3a3] mt-1.5">{sub}</p>
    </>
  );
  if (href) return <Link href={href} className="card-hover p-5 block">{content}</Link>;
  return <div className="card p-5">{content}</div>;
}
