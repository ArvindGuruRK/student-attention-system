"use client";

import { cn } from "@/lib/utils";
import type { StudentSessionStats } from "@/lib/api";

interface StudentCardProps {
  stats: StudentSessionStats;
  delay?: number;
}

export function StudentCard({ stats, delay = 0 }: StudentCardProps) {
  const avg = stats.avg_score;
  const isAlert = avg < 40;
  const isAtRisk = avg >= 40 && avg < 60;
  const isDark = isAlert || isAtRisk;

  const borderClass = isAlert
    ? "border-[#0a0a0a]"
    : isAtRisk
    ? "border-[#737373]"
    : avg < 80
    ? "border-[#d4d4d4]"
    : "border-[#e8e8e8]";

  return (
    <div
      className={cn(
        "card rounded-2xl p-5 border-l-[3px] animate-in",
        borderClass,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0a0a0a] truncate">{stats.student_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-black tabular-nums text-[#0a0a0a]">{avg}%</span>
            <span className="text-[10px] text-[#c8c8c8]">avg</span>
            {stats.alert_count > 0 && (
              <>
                <span className="text-[10px] text-[#c8c8c8]">·</span>
                <span className="text-[10px] font-semibold text-[#525252]">
                  {stats.alert_count} alert{stats.alert_count > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Score visual */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black tabular-nums shrink-0",
          isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f5f5f5] text-[#0a0a0a]",
        )}>
          {avg}
        </div>
      </div>

      {/* Min/Max row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-[#f7f7f7] rounded-lg px-3 py-1.5 text-center">
          <p className="text-[10px] text-[#a3a3a3]">Min</p>
          <p className="text-xs font-bold tabular-nums text-[#525252]">{stats.min_score}%</p>
        </div>
        <div className="flex-1 bg-[#f7f7f7] rounded-lg px-3 py-1.5 text-center">
          <p className="text-[10px] text-[#a3a3a3]">Max</p>
          <p className="text-xs font-bold tabular-nums text-[#525252]">{stats.max_score}%</p>
        </div>
        {/* Score bar */}
        <div className="flex-1">
          <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0a0a0a] rounded-full"
              style={{ width: `${avg}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flags */}
      {stats.top_flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {stats.top_flags.map((f) => (
            <span
              key={f}
              className="badge badge-light text-[10px] px-2 py-0.5"
            >
              {f.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
