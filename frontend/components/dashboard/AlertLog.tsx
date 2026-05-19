"use client";

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertEntry } from "@/hooks/useLiveSession";

interface AlertLogProps {
  alerts: AlertEntry[];
}

export function AlertLog({ alerts }: AlertLogProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 bg-[#f5f5f5] rounded-xl flex items-center justify-center mb-3">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-[#d4d4d4]" />
        </div>
        <p className="text-xs font-medium text-[#c8c8c8]">No alerts yet</p>
        <p className="text-[10px] text-[#d4d4d4] mt-0.5">All students are on track</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-0.5">
      {alerts.map((a) => {
        const isAlert = a.alert_type === "DISTRACTED";
        return (
          <div
            key={a.id}
            className={cn(
              "rounded-xl px-3.5 py-3 border-l-2 animate-slideInRight",
              isAlert ? "bg-[#0a0a0a] border-[#0a0a0a] text-white" : "bg-[#f5f5f5] border-[#c8c8c8] text-[#525252]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold truncate", isAlert ? "text-white" : "text-[#0a0a0a]")}>
                  {a.student_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isAlert ? "text-white/60" : "text-[#737373]")}>
                    {a.alert_type === "DISTRACTED" ? "Alert" : "Recovered"}
                  </span>
                  <span className={cn("text-[10px]", isAlert ? "text-white/40" : "text-[#a3a3a3]")}>·</span>
                  <span className={cn("text-[10px] font-semibold tabular-nums", isAlert ? "text-white/80" : "text-[#525252]")}>
                    {a.attention_score}%
                  </span>
                </div>
              </div>
              <span className={cn("text-[10px] shrink-0 tabular-nums mt-0.5", isAlert ? "text-white/40" : "text-[#c8c8c8]")}>
                {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
