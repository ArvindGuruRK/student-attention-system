"use client";

import { Smartphone } from "lucide-react";
import {
  cn,
  statusToTileClasses,
  statusToScoreClass,
  statusToTextClass,
  statusToBadgeClasses,
  statusDotClass,
  statusToRingClass,
  statusLabel,
  type AttentionStatus,
} from "@/lib/utils";
import type { LiveStudent } from "@/hooks/useLiveSession";

interface StudentTileProps {
  student: LiveStudent;
}

export function StudentTile({ student }: StudentTileProps) {
  const status       = student.status as AttentionStatus;
  const tileClasses  = statusToTileClasses(status);
  const scoreClass   = statusToScoreClass(status);
  const textClass    = statusToTextClass(status);
  const badgeClasses = statusToBadgeClasses(status);
  const dotClass     = statusDotClass(status);
  const ringClass    = statusToRingClass(status);
  const label        = statusLabel(status);
  const isAlert         = status === "alert";
  const isAtRisk        = status === "at_risk";
  const isPhoneDetected = student.flags.includes("phone_detected");

  return (
    <div
      className={cn(
        "relative border rounded-2xl p-4 flex flex-col gap-2 transition-all duration-500 overflow-hidden",
        tileClasses,
      )}
    >
      {/* Pulsing ring for critical states */}
      {(isAlert || isAtRisk) && (
        <span
          className={cn(
            "absolute inset-0 rounded-2xl ring-2 pointer-events-none",
            isAlert ? `${ringClass} animate-pulse` : ringClass,
          )}
        />
      )}

      {/* Top row: status dot + flag count */}
      <div className="flex items-center justify-between">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {isAlert && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotClass,
              )}
            />
          )}
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotClass)} />
        </span>

        <div className="flex items-center gap-1">
          {isPhoneDetected && (
            <Smartphone className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          {student.flags.length > 0 && (
            <span
              className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                badgeClasses,
              )}
            >
              {student.flags.length} flag{student.flags.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Score — semantic color, dominant element */}
      <div className={cn("text-4xl font-black tracking-tighter leading-none tabular-nums", scoreClass)}>
        {student.attention_score}
        <span className="text-base font-semibold ml-0.5 opacity-50">%</span>
      </div>

      {/* Name + status label */}
      <div>
        <p className="text-xs font-semibold truncate leading-tight text-[#0a0a0a]">
          {student.student_name}
        </p>
        <p className={cn("text-[10px] mt-0.5 font-medium", textClass)}>
          {label}
        </p>
      </div>

      {/* Flag tags */}
      {student.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {student.flags.map((f) => (
            <span
              key={f}
              className={cn(
                "text-[9px] font-medium px-1.5 py-0.5 rounded-md border",
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
