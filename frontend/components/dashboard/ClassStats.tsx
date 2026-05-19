"use client";

import {
  cn,
  scoreToStatus,
  statusToTileClasses,
  statusToScoreClass,
  statusToBarClass,
  statusToTextClass,
  type AttentionStatus,
} from "@/lib/utils";
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
  const avgStatus: AttentionStatus = avg > 0 ? scoreToStatus(avg) : "attentive";

  const attentiveCount  = Object.values(students).filter((s) => s.status === "attentive").length;
  const distractedCount = Object.values(students).filter((s) => s.status === "distracted").length;

  const avgTile  = avg > 0 ? statusToTileClasses(avgStatus)  : "bg-white border-[#e8e8e8]";
  const avgScore = avg > 0 ? statusToScoreClass(avgStatus)   : "text-[#d4d4d4]";
  const avgBar   = avg > 0 ? statusToBarClass(avgStatus)     : "bg-[#e8e8e8]";
  const avgText  = avg > 0 ? statusToTextClass(avgStatus)    : "text-[#a3a3a3]";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Class average — primary stat with semantic color */}
      <div className={cn("card p-5 col-span-2 lg:col-span-1 border transition-colors duration-700", avgTile)}>
        <p className={cn("section-title mb-2", avgText)}>Class Average</p>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-5xl font-black tracking-tighter leading-none tabular-nums", avgScore)}>
            {avg || "—"}
          </span>
          {avg > 0 && (
            <span className={cn("text-xl font-bold opacity-50", avgScore)}>%</span>
          )}
        </div>
        {avg > 0 && (
          <div className="mt-3 h-1 rounded-full overflow-hidden bg-black/8">
            <div
              className={cn("h-full rounded-full transition-all duration-1000", avgBar)}
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
        status={atRiskCount > 0 ? (atRiskCount > 2 ? "alert" : "at_risk") : undefined}
      />

      {/* Connection status */}
      <div className="card p-5">
        <p className="section-title mb-2">Stream</p>
        <div className="flex items-center gap-2">
          <span className={cn("relative flex h-2 w-2", !connected && "opacity-30")}>
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green-pulse opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                connected ? "bg-status-green-pulse" : "bg-[#d4d4d4]",
              )}
            />
          </span>
          <span className={cn("text-sm font-bold", connected ? "text-status-green-text" : "text-[#a3a3a3]")}>
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="text-[10px] text-status-green-text font-medium">{attentiveCount} attentive</span>
          <span className="text-[10px] text-[#a3a3a3]">·</span>
          <span className="text-[10px] text-status-yellow-text font-medium">{distractedCount} distracted</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub: string;
  status?: AttentionStatus;
}) {
  const tileClasses  = status ? statusToTileClasses(status) : "";
  const scoreClass   = status ? statusToScoreClass(status)  : "text-[#0a0a0a]";
  const textClass    = status ? statusToTextClass(status)   : "text-[#a3a3a3]";

  return (
    <div
      className={cn(
        "card p-5 border transition-colors duration-500",
        status ? tileClasses : "bg-white border-[#e8e8e8]",
      )}
    >
      <p className={cn("section-title mb-2", status ? textClass : "")}>
        {label}
      </p>
      <span className={cn("text-4xl font-black tracking-tighter leading-none tabular-nums", scoreClass)}>
        {value}
      </span>
      <p className={cn("text-[11px] mt-1.5", textClass)}>{sub}</p>
    </div>
  );
}
