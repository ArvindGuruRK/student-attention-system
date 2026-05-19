"use client";

import {
  cn,
  statusLabel,
  statusToTileClasses,
  statusToScoreClass,
  statusToBarClass,
  statusToTextClass,
  statusToBadgeClasses,
  statusDotClass,
  type AttentionStatus,
} from "@/lib/utils";

interface StatusIndicatorProps {
  score: number;
  flags: string[];
  status: AttentionStatus;
}

export function StatusIndicator({ score, flags, status }: StatusIndicatorProps) {
  const tileClasses    = statusToTileClasses(status);
  const scoreClass     = statusToScoreClass(status);
  const barClass       = statusToBarClass(status);
  const textClass      = statusToTextClass(status);
  const badgeClasses   = statusToBadgeClasses(status);
  const dotClass       = statusDotClass(status);
  const label          = statusLabel(status);
  const isAlert        = status === "alert";

  return (
    <div
      className={cn(
        "w-full max-w-sm mx-auto rounded-2xl p-6 border transition-colors duration-700",
        tileClasses,
      )}
    >
      {/* Status row: pulsing dot + label */}
      <div className="flex items-center gap-2 mb-5">
        <span className="relative flex h-2 w-2 shrink-0">
          {isAlert && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotClass,
              )}
            />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotClass)} />
        </span>
        <p className={cn("text-xs font-semibold uppercase tracking-widest", textClass)}>
          {label}
        </p>
      </div>

      {/* Score — dominant number, semantic color */}
      <div className="text-center mb-5">
        <span className={cn("text-7xl font-black tracking-tighter leading-none tabular-nums", scoreClass)}>
          {score}
        </span>
        <span className={cn("text-3xl font-bold opacity-50", scoreClass)}>%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-black/8 mb-5">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barClass)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Flag badges */}
      {flags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {flags.map((f) => (
            <span
              key={f}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-lg border",
                badgeClasses,
              )}
            >
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
