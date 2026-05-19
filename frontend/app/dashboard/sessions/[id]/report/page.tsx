"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api, type SessionReport } from "@/lib/api";
import { SessionTimeline } from "@/components/report/SessionTimeline";
import { StudentCard } from "@/components/report/StudentCard";
import { ExportButton } from "@/components/report/ExportButton";
import { formatDuration } from "@/lib/utils";

export default function SessionReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.sessions.report(id).then(setReport).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-4xl">
        <div className="skeleton h-8 w-52 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
        <div className="skeleton h-56 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      </div>
    );
  }

  if (error) return (
    <div className="max-w-4xl animate-fadeIn">
      <h1 className="page-title mb-4">Session Report</h1>
      <div className="card p-5"><p className="text-sm text-[#525252]">{error}</p></div>
    </div>
  );

  if (!report) return null;

  const summaryStats = [
    { label: "Duration",      value: formatDuration(report.duration_minutes), unit: "",  sub: "total session time" },
    { label: "Class Average", value: String(report.class_avg),                unit: "%", sub: "attention score"    },
    { label: "At Risk",       value: String(report.at_risk_count),            unit: "",  sub: "students flagged"   },
    { label: "Students",      value: String(report.student_stats.length),     unit: "",  sub: "participated"       },
  ];

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/sessions" className="text-xs text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">Sessions</Link>
            <ChevronRight size={12} strokeWidth={1.75} className="text-[#d4d4d4]" />
            <span className="text-xs text-[#737373]">Report</span>
          </div>
          <h1 className="page-title">Session Report</h1>
          {report.started_at && (
            <p className="text-sm text-[#737373] mt-1">
              {new Date(report.started_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <ExportButton sessionId={id} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryStats.map(({ label, value, unit, sub }, i) => (
          <div key={label} className="card p-5 animate-in" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="section-title mb-3">{label}</p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl font-semibold text-[#0a0a0a] tracking-tight leading-none tabular-nums">{value}</span>
              {unit && <span className="text-lg font-medium text-[#737373] ml-0.5">{unit}</span>}
            </div>
            <p className="text-[11px] text-[#a3a3a3] mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card p-6 animate-in stagger-2">
        <div className="flex items-center justify-between mb-5">
          <span className="section-title">Attention Timeline</span>
          <span className="text-xs text-[#a3a3a3]">minute-by-minute class average</span>
        </div>
        <SessionTimeline data={report.timeline} />
      </div>

      {/* Student breakdown */}
      <div className="card animate-in stagger-3">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <span className="section-title">Student Breakdown</span>
          <span className="text-xs text-[#a3a3a3]">sorted by attention · lowest first</span>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.student_stats.sort((a, b) => a.avg_score - b.avg_score).map((s, i) => (
            <StudentCard key={s.student_id} stats={s} delay={i * 30} />
          ))}
        </div>
      </div>
    </div>
  );
}
