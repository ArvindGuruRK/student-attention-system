import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type AttentionStatus = "attentive" | "distracted" | "at_risk" | "alert";

/** Map a numeric score to a status label matching the backend thresholds. */
export function scoreToStatus(score: number): AttentionStatus {
  if (score >= 80) return "attentive";
  if (score >= 60) return "distracted";
  if (score >= 40) return "at_risk";
  return "alert";
}

/**
 * Monochrome fill system: darkness encodes distraction level.
 * Attentive → white  |  Alert → black
 */
export function statusToTileClasses(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-white border-[#e8e8e8] text-[#0a0a0a]",
    distracted: "bg-[#f0f0f0] border-[#d4d4d4] text-[#404040]",
    at_risk:    "bg-[#404040] border-[#404040] text-white",
    alert:      "bg-[#0a0a0a] border-[#0a0a0a] text-white",
  };
  return map[status];
}

/** Legacy color class — kept for backward compat, maps to monochrome scale. */
export function statusToColor(status: AttentionStatus): string {
  return statusToTileClasses(status);
}

/** Map a status to a human-readable label. */
export function statusLabel(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "Attentive",
    distracted: "Distracted",
    at_risk: "At Risk",
    alert: "Alert",
  };
  return map[status];
}

/** Map a status to a small indicator dot class. */
export function statusDotClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-[#0a0a0a]",
    distracted: "bg-[#737373]",
    at_risk:    "bg-[#404040]",
    alert:      "bg-[#0a0a0a]",
  };
  return map[status];
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
