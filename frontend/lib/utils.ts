import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type AttentionStatus = "attentive" | "distracted" | "at_risk" | "alert";

/** Map a numeric score (0–100) to a status tier matching backend thresholds. */
export function scoreToStatus(score: number): AttentionStatus {
  if (score >= 80) return "attentive";
  if (score >= 60) return "distracted";
  if (score >= 40) return "at_risk";
  return "alert";
}

/** Card background + border for a given status (semantic colors). */
export function statusToTileClasses(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-status-green-bg  border-status-green-border",
    distracted: "bg-status-yellow-bg border-status-yellow-border",
    at_risk:    "bg-status-orange-bg border-status-orange-border",
    alert:      "bg-status-red-bg    border-status-red-border",
  };
  return map[status];
}

/** Large score number color (vibrant, high-contrast). */
export function statusToScoreClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "text-status-green",
    distracted: "text-status-yellow",
    at_risk:    "text-status-orange",
    alert:      "text-status-red",
  };
  return map[status];
}

/** Progress bar fill color. */
export function statusToBarClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-status-green",
    distracted: "bg-status-yellow",
    at_risk:    "bg-status-orange",
    alert:      "bg-status-red",
  };
  return map[status];
}

/** Subtle label / subtitle text (slightly darker than bg, readable). */
export function statusToTextClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "text-status-green-text",
    distracted: "text-status-yellow-text",
    at_risk:    "text-status-orange-text",
    alert:      "text-status-red-text",
  };
  return map[status];
}

/** Indicator dot color. */
export function statusDotClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-status-green-pulse",
    distracted: "bg-status-yellow-pulse",
    at_risk:    "bg-status-orange-pulse",
    alert:      "bg-status-red-pulse",
  };
  return map[status];
}

/** Flag / tag badge background + text + border. */
export function statusToBadgeClasses(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "bg-status-green-bg  text-status-green-text  border-status-green-border",
    distracted: "bg-status-yellow-bg text-status-yellow-text border-status-yellow-border",
    at_risk:    "bg-status-orange-bg text-status-orange-text border-status-orange-border",
    alert:      "bg-status-red-bg    text-status-red-text    border-status-red-border",
  };
  return map[status];
}

/** Pulse ring color for alert states. */
export function statusToRingClass(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "ring-status-green/20",
    distracted: "ring-status-yellow/20",
    at_risk:    "ring-status-orange/30",
    alert:      "ring-status-red/40",
  };
  return map[status];
}

/** Human-readable label for a status tier. */
export function statusLabel(status: AttentionStatus): string {
  const map: Record<AttentionStatus, string> = {
    attentive: "Attentive",
    distracted: "Distracted",
    at_risk: "At Risk",
    alert: "Alert",
  };
  return map[status];
}

/** @deprecated Use statusToTileClasses. Kept for backward compatibility. */
export function statusToColor(status: AttentionStatus): string {
  return statusToTileClasses(status);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
