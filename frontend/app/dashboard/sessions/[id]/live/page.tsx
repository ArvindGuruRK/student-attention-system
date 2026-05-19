"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Square, Loader2, StopCircle } from "lucide-react";
import { useLiveSession } from "@/hooks/useLiveSession";
import { StudentGrid } from "@/components/dashboard/StudentGrid";
import { AlertLog } from "@/components/dashboard/AlertLog";
import { ClassStats } from "@/components/dashboard/ClassStats";
import { AttentionChart } from "@/components/dashboard/AttentionChart";
import { api } from "@/lib/api";

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { students, alerts, classAvg, atRiskCount, connected } = useLiveSession(id);
  const [ending, setEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<Date>(new Date());

  useEffect(() => {
    api.sessions.getStatus(id).then((s) => { if (s.ended_at) setSessionEnded(true); }).catch(() => {});
  }, [id]);

  const chartData = useRef<{ time: string; avg: number }[]>([]);
  const [chartSnapshot, setChartSnapshot] = useState<{ time: string; avg: number }[]>([]);

  useEffect(() => {
    if (classAvg > 0) {
      const point = { time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), avg: Math.round(classAvg) };
      chartData.current = [...chartData.current, point].slice(-60);
      setChartSnapshot([...chartData.current]);
    }
  }, [classAvg]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleEndSession() {
    setEndConfirm(false); setEnding(true);
    try {
      await api.sessions.end(id);
      router.push(`/dashboard/sessions/${id}/report`);
    } catch { setEnding(false); }
  }

  const elapsedStr = (() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  if (sessionEnded) {
    return (
      <div className="max-w-lg mx-auto mt-24 animate-fadeIn">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <StopCircle size={22} strokeWidth={1.5} className="text-[#a3a3a3]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0a0a0a] mb-2">Session Ended</h2>
          <p className="text-sm text-[#737373] mb-7">This session is no longer active. View the report or start a new session.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/dashboard/sessions/${id}/report`)} className="btn-primary text-xs px-5 py-2.5">View Report</button>
            <button onClick={() => router.push("/dashboard/classrooms")} className="btn-secondary text-xs px-5 py-2.5">Classrooms</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <h1 className="page-title">Live Session</h1>
            <span className={`relative flex h-2 w-2 mt-1 ${connected ? "opacity-100" : "opacity-30"}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0a0a0a]" />
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3]">{connected ? `Connected · ${elapsedStr}` : "Reconnecting…"}</p>
        </div>
        <button onClick={() => setEndConfirm(true)} disabled={ending} className="btn-secondary text-xs px-4 py-2.5 shrink-0">
          {ending ? <><Loader2 size={13} className="animate-spin" /> Ending…</> : <><Square size={12} strokeWidth={2} /> End Session</>}
        </button>
      </div>

      {/* Stats */}
      <ClassStats classAvg={classAvg} atRiskCount={atRiskCount} students={students} connected={connected} />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="section-title">Students</span>
              <span className="text-xs text-[#a3a3a3] tabular-nums">{Object.keys(students).length} online</span>
            </div>
            <StudentGrid students={students} />
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="section-title">Class Average</span>
              {classAvg > 0 && <span className="text-lg font-semibold text-[#0a0a0a] tabular-nums tracking-tight">{Math.round(classAvg)}</span>}
            </div>
            <AttentionChart data={chartSnapshot} />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <span className="section-title">Alerts</span>
            {alerts.length > 0 && <span className="badge badge-dark text-[10px] px-2 py-0.5">{alerts.length}</span>}
          </div>
          <AlertLog alerts={alerts} />
        </div>
      </div>

      {/* End confirm dialog */}
      {endConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setEndConfirm(false)} />
          <div className="relative card w-full max-w-sm p-7 shadow-modal animate-slideUp">
            <h3 className="text-base font-semibold text-[#0a0a0a] mb-1.5">End Session?</h3>
            <p className="text-sm text-[#737373] mb-6">The session will close and you&apos;ll be redirected to the analytics report.</p>
            <div className="flex gap-3">
              <button onClick={() => setEndConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleEndSession} className="btn-primary flex-1">End & Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
