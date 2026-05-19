"use client";

import { cn } from "@/lib/utils";
import type { LiveStudent } from "@/hooks/useLiveSession";

interface ClassStatsProps {
  classAvg: number;
  atRiskCount: number;
  students: Record<string, LiveStudent>;
  connected: boolean;
}

export function ClassStats({ classAvg, atRiskCount, students, connected }: ClassStatsProps) {
  const total = Object.keys(students).length;
  const avg = Math.round(classAvg);

  const attentiveCount = Object.values(students).filter((s) => s.status === "attentive").length;
  const distractedCount = Object.values(students).filter((s) => s.status === "distracted").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Class average — primary stat */}
      <div className={cn(
        "card p-5 col-span-2 lg:col-span-1",
        avg < 40 && "bg-[#0a0a0a] border-[#0a0a0a]",
        avg >= 40 && avg < 60 && "bg-[#404040] border-[#404040]",
      )}>
        <p className={cn(
          "section-title mb-2",
          avg < 60 ? "text-white/50" : "",
        )}>
          Class Average
        </p>
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "text-5xl font-black tracking-tighter leading-none tabular-nums",
            avg < 60 ? "text-white" : "text-[#0a0a0a]",
          )}>
            {avg || "—"}
          </span>
          {avg > 0 && (
            <span className={cn("text-xl font-bold", avg < 60 ? "text-white/50" : "text-[#a3a3a3]")}>%</span>
          )}
        </div>
        {/* Mini bar */}
        {avg > 0 && (
          <div className={cn("mt-3 h-1 rounded-full overflow-hidden", avg < 60 ? "bg-white/10" : "bg-[#f0f0f0]")}>
            <div
              className={cn("h-full rounded-full transition-all duration-1000", avg < 60 ? "bg-white/40" : "bg-[#0a0a0a]")}
              style={{ width: `${avg}%` }}
            />
          </div>
        )}
      </div>

      <StatCard label="Online" value={String(total)} sub="students connected" />

      <StatCard
        label="At Risk"
        value={String(atRiskCount)}
        sub={atRiskCount > 0 ? "need attention" : "all on track"}
        dark={atRiskCount > 2}
      />

      {/* Connection status */}
      <div className="card p-5">
        <p className="section-title mb-2">Stream</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "relative flex h-2 w-2",
            !connected && "opacity-30",
          )}>
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0a0a0a]" />
          </span>
          <span className="text-sm font-bold text-[#0a0a0a]">
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="text-[10px] text-[#a3a3a3] font-medium">
            {attentiveCount} attentive
          </span>
          <span className="text-[10px] text-[#a3a3a3]">·</span>
          <span className="text-[10px] text-[#a3a3a3] font-medium">
            {distractedCount} distracted
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  dark = false,
}: {
  label: string;
  value: string;
  sub: string;
  dark?: boolean;
}) {
  return (
    <div className={cn(
      "card p-5 transition-colors duration-500",
      dark && "bg-[#0a0a0a] border-[#0a0a0a]",
    )}>
      <p className={cn("section-title mb-2", dark ? "text-white/50" : "")}>
        {label}
      </p>
      <span className={cn(
        "text-4xl font-black tracking-tighter leading-none tabular-nums",
        dark ? "text-white" : "text-[#0a0a0a]",
      )}>
        {value}
      </span>
      <p className={cn("text-[11px] mt-1.5", dark ? "text-white/40" : "text-[#a3a3a3]")}>{sub}</p>
    </div>
  );
}
