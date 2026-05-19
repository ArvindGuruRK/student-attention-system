"use client";

import { cn, statusLabel, statusToTileClasses, type AttentionStatus } from "@/lib/utils";

interface StatusIndicatorProps {
  score: number;
  flags: string[];
  status: AttentionStatus;
}

export function StatusIndicator({ score, flags, status }: StatusIndicatorProps) {
  const tileClasses = statusToTileClasses(status);
  const label = statusLabel(status);
  const isDark = status === "alert" || status === "at_risk";

  return (
    <div className={cn(
      "w-full max-w-sm mx-auto rounded-2xl p-6 border text-center transition-colors duration-700",
      tileClasses,
    )}>
      {/* Score — massive number */}
      <div className={cn(
        "text-7xl font-black tracking-tighter leading-none tabular-nums mb-1",
        isDark ? "text-white" : "text-[#0a0a0a]",
      )}>
        {score}
        <span className={cn("text-3xl font-bold", isDark ? "text-white/40" : "text-[#c8c8c8]")}>%</span>
      </div>

      {/* Status label */}
      <p className={cn(
        "text-sm font-semibold uppercase tracking-widest mb-4",
        isDark ? "text-white/60" : "text-[#737373]",
      )}>
        {label}
      </p>

      {/* Score bar */}
      <div className={cn("h-1.5 rounded-full overflow-hidden mb-4", isDark ? "bg-white/10" : "bg-[#f0f0f0]")}>
        <div
          className={cn("h-full rounded-full transition-all duration-700", isDark ? "bg-white/50" : "bg-[#0a0a0a]")}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {flags.map((f) => (
            <span
              key={f}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-lg",
                isDark ? "bg-white/10 text-white/70" : "bg-[#0a0a0a]/8 text-[#525252]",
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
