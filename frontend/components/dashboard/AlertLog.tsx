"use client";

import { ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertEntry } from "@/hooks/useLiveSession";

interface AlertLogProps {
  alerts: AlertEntry[];
}

export function AlertLog({ alerts }: AlertLogProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 bg-status-green-bg border border-status-green-border rounded-xl flex items-center justify-center mb-3">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-status-green" />
        </div>
        <p className="text-xs font-medium text-status-green-text">No alerts yet</p>
        <p className="text-[10px] text-[#d4d4d4] mt-0.5">All students are on track</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-0.5">
      {alerts.map((a) => {
        const isDistracted = a.alert_type === "DISTRACTED";
        const isPhone      = a.alert_type === "PHONE_DETECTED";

        const containerClass = isDistracted
          ? "bg-status-red-bg    border-status-red    text-status-red-text"
          : isPhone
          ? "bg-status-orange-bg border-status-orange text-status-orange-text"
          : "bg-status-green-bg  border-status-green  text-status-green-text";

        const labelClass = isDistracted
          ? "text-status-red-text"
          : isPhone
          ? "text-status-orange-text"
          : "text-status-green-text";

        const scoreClass = isDistracted
          ? "text-status-red"
          : isPhone
          ? "text-status-orange"
          : "text-status-green";

        const label = isDistracted ? "Alert" : isPhone ? "Phone Detected" : "Recovered";

        return (
          <div
            key={a.id}
            className={cn(
              "rounded-xl px-3.5 py-3 border-l-2 animate-slideInRight",
              containerClass,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-[#0a0a0a]">
                  {a.student_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPhone && (
                    <Smartphone className="h-3 w-3 shrink-0 text-status-orange" />
                  )}
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    labelClass,
                  )}>
                    {label}
                  </span>
                  <span className="text-[10px] text-[#a3a3a3]">·</span>
                  <span className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    scoreClass,
                  )}>
                    {a.attention_score}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] shrink-0 tabular-nums mt-0.5 text-[#c8c8c8]">
                {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
