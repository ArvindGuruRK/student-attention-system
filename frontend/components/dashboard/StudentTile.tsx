"use client";

import { cn, statusToTileClasses, statusLabel, type AttentionStatus } from "@/lib/utils";
import type { LiveStudent } from "@/hooks/useLiveSession";

interface StudentTileProps {
  student: LiveStudent;
}

export function StudentTile({ student }: StudentTileProps) {
  const status = student.status as AttentionStatus;
  const tileClasses = statusToTileClasses(status);
  const label = statusLabel(status);
  const isAlert = status === "alert";
  const isAtRisk = status === "at_risk";
  const isDark = isAlert || isAtRisk;

  return (
    <div
      className={cn(
        "relative border rounded-2xl p-4 flex flex-col gap-2 transition-all duration-500 overflow-hidden",
        tileClasses,
      )}
    >
      {/* Alert pulse ring */}
      {isAlert && (
        <span className="absolute inset-0 rounded-2xl ring-2 ring-white/20 animate-pulse pointer-events-none" />
      )}

      {/* Status dot */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isAlert ? "bg-white animate-pulse" :
            isAtRisk ? "bg-white/60" :
            status === "distracted" ? "bg-[#a3a3a3]" :
            "bg-[#d4d4d4]",
          )}
        />
        {student.flags.length > 0 && (
          <div
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
              isDark ? "bg-white/15 text-white/70" : "bg-[#0a0a0a]/8 text-[#525252]",
            )}
          >
            {student.flags.length} flag{student.flags.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Score — the dominant element */}
      <div className={cn(
        "text-4xl font-black tracking-tighter leading-none tabular-nums",
        isDark ? "text-white" : "text-[#0a0a0a]",
      )}>
        {student.attention_score}
        <span className={cn("text-base font-semibold ml-0.5", isDark ? "text-white/50" : "text-[#a3a3a3]")}>
          %
        </span>
      </div>

      {/* Name + status */}
      <div>
        <p className={cn(
          "text-xs font-semibold truncate leading-tight",
          isDark ? "text-white" : "text-[#0a0a0a]",
        )}>
          {student.student_name}
        </p>
        <p className={cn(
          "text-[10px] mt-0.5 font-medium",
          isDark ? "text-white/50" : "text-[#a3a3a3]",
        )}>
          {label}
        </p>
      </div>

      {/* Flags */}
      {student.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {student.flags.map((f) => (
            <span
              key={f}
              className={cn(
                "text-[9px] font-medium px-1.5 py-0.5 rounded-md",
                isDark ? "bg-white/10 text-white/60" : "bg-[#0a0a0a]/6 text-[#737373]",
              )}
            >
              {f.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
