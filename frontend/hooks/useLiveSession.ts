"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectTeacher, getSocket } from "@/lib/socket";
import { getToken } from "@/lib/auth";
import { scoreToStatus, type AttentionStatus } from "@/lib/utils";

export interface LiveStudent {
  student_id: string;
  student_name: string;
  status: AttentionStatus;
  attention_score: number;
  flags: string[];
  yaw: number | null;
  pitch: number | null;
  trend: string;
}

export interface AlertEntry {
  id: string;
  student_id: string;
  student_name: string;
  alert_type: string;
  attention_score: number;
  timestamp: string;
}

export interface SessionState {
  students: Record<string, LiveStudent>;
  alerts: AlertEntry[];
  classAvg: number;
  atRiskCount: number;
  connected: boolean;
}

/** Aggregates live Socket.io events into per-student state for the teacher dashboard. */
export function useLiveSession(sessionId: string): SessionState {
  const [students, setStudents] = useState<Record<string, LiveStudent>>({});
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [classAvg, setClassAvg] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const alertCounter = useRef(0);

  const handleStatusUpdate = useCallback((data: unknown) => {
    const d = data as LiveStudent;
    setStudents((prev) => ({
      ...prev,
      [d.student_id]: { ...d, status: scoreToStatus(d.attention_score) },
    }));
  }, []);

  const handleAlert = useCallback((data: unknown) => {
    const d = data as AlertEntry;
    alertCounter.current += 1;
    setAlerts((prev) => [{ ...d, id: String(alertCounter.current) }, ...prev].slice(0, 100));
  }, []);

  const handleSnapshot = useCallback((data: unknown) => {
    const d = data as {
      class_avg: number;
      at_risk_count: number;
      students: LiveStudent[];
    };
    setClassAvg(d.class_avg);
    setAtRiskCount(d.at_risk_count);
    setStudents((prev) => {
      const next = { ...prev };
      for (const s of d.students) {
        next[s.student_id] = { ...s, status: scoreToStatus(s.attention_score) };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = connectTeacher(sessionId, token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("STATUS_UPDATE", handleStatusUpdate);
    socket.on("ALERT", handleAlert);
    socket.on("SESSION_SNAPSHOT", handleSnapshot);

    // If socket was already connected before listeners were registered, sync state now
    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("STATUS_UPDATE", handleStatusUpdate);
      socket.off("ALERT", handleAlert);
      socket.off("SESSION_SNAPSHOT", handleSnapshot);
    };
  }, [sessionId, handleStatusUpdate, handleAlert, handleSnapshot]);

  return { students, alerts, classAvg, atRiskCount, connected };
}
