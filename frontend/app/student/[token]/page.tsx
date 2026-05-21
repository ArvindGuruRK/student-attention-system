"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Eye, Loader2 } from "lucide-react";
import { CameraFeed } from "@/components/student/CameraFeed";
import { StatusIndicator } from "@/components/student/StatusIndicator";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { api } from "@/lib/api";
import { connectStudent } from "@/lib/socket";
import { scoreToStatus } from "@/lib/utils";

type SocketStatus = "connecting" | "connected" | "joined" | "error" | "ended";

export default function StudentPage() {
  const { token } = useParams<{ token: string }>();
  const [consentGiven, setConsentGiven] = useState(false);
  const [cameraDeclined, setCameraDeclined] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [socketError, setSocketError] = useState("");

  // Only connect to the socket after the student has given camera consent
  useEffect(() => {
    if (!consentGiven) return;

    const socket = connectStudent(token);

    function onConnect() {
      setSocketStatus("connected");
    }
    function onConnectError(err: Error) {
      setSocketStatus("error");
      setSocketError(`Cannot reach server: ${err.message}`);
    }
    function onJoined(data: { session_id: string; student_id: string }) {
      setSessionId(data.session_id);
      setStudentId(data.student_id);
      setSocketStatus("joined");
    }
    function onError(data: { message: string }) {
      setSocketStatus("error");
      setSocketError(data.message);
    }
    function onSessionEnded() {
      setSocketStatus("ended");
    }

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("joined", onJoined);
    socket.on("error", onError);
    socket.on("SESSION_ENDED", onSessionEnded);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("joined", onJoined);
      socket.off("error", onError);
      socket.off("SESSION_ENDED", onSessionEnded);
    };
  }, [token, consentGiven]);

  // Fallback poll: handles the case where the student missed SESSION_ENDED (tab backgrounded, reconnect, etc.)
  useEffect(() => {
    if (!sessionId || socketStatus === "ended") return;
    const intervalId = setInterval(async () => {
      try {
        const session = await api.sessions.getStatus(sessionId);
        if (session.ended_at) setSocketStatus("ended");
      } catch {
        // ignore transient fetch errors — socket event is the primary path
      }
    }, 30_000);
    return () => clearInterval(intervalId);
  }, [sessionId, socketStatus]);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const onStreamReady = useCallback((v: HTMLVideoElement) => {
    videoElementRef.current = v;
  }, []);

  const sessionEnded = socketStatus === "ended";

  // Gate MediaPipe: pass true for the stop flag until consent is given or session ends
  const { score, flags, isRunning, error: cvError } = useMediaPipe(
    videoElementRef as React.RefObject<HTMLVideoElement>,
    sessionId,
    studentId,
    token,
    !consentGiven || sessionEnded,
  );

  const status = scoreToStatus(score);

  const statusConfig: Record<SocketStatus, { text: string; dot: string; textColor: string }> = {
    connecting: { text: "Connecting to server…", dot: "bg-[#d4d4d4] animate-pulse",          textColor: "text-[#a3a3a3]" },
    connected:  { text: "Joining session…",       dot: "bg-status-yellow-pulse animate-pulse", textColor: "text-status-yellow-text" },
    joined:     { text: "Session active",          dot: "bg-status-green-pulse",                textColor: "text-status-green-text" },
    error:      { text: socketError || "Connection error", dot: "bg-status-red-pulse",          textColor: "text-status-red-text" },
    ended:      { text: "Session ended",                   dot: "bg-status-green-pulse",         textColor: "text-status-green-text" },
  };

  const { text: statusText, dot: dotClass, textColor } = statusConfig[socketStatus];

  // Consent gate — shown before any camera or socket activity
  if (!consentGiven) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center gap-6 p-6">
        {/* App header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
            <Eye size={14} strokeWidth={1.75} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#0a0a0a]">Attend — Student View</span>
        </div>

        {/* Consent card */}
        <div className="w-full max-w-sm bg-white border-2 border-[#e8e8e8] rounded-2xl p-8 flex flex-col items-center gap-6">
          {/* Shield icon */}
          <div className="w-14 h-14 bg-[#f0fdf4] rounded-2xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-[#0a0a0a] mb-1">Camera Permission Required</p>
            <p className="text-xs text-[#737373] leading-relaxed">
              This session uses your camera to measure attention. Here&rsquo;s exactly what happens:
            </p>
          </div>

          {/* What IS collected */}
          <ul className="w-full space-y-2">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-4 h-4 bg-[#f0fdf4] rounded-full flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                  <circle cx="4" cy="4" r="3" fill="#16a34a" />
                </svg>
              </span>
              <span className="text-xs text-[#404040] leading-relaxed">
                <strong className="font-semibold text-[#0a0a0a]">Head pose</strong> — yaw and pitch angles are estimated locally
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-4 h-4 bg-[#f0fdf4] rounded-full flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                  <circle cx="4" cy="4" r="3" fill="#16a34a" />
                </svg>
              </span>
              <span className="text-xs text-[#404040] leading-relaxed">
                <strong className="font-semibold text-[#0a0a0a]">Attention score</strong> — a 0–100 number sent to your teacher
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-4 h-4 bg-[#f0fdf4] rounded-full flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                  <circle cx="4" cy="4" r="3" fill="#16a34a" />
                </svg>
              </span>
              <span className="text-xs text-[#404040] leading-relaxed">
                <strong className="font-semibold text-[#0a0a0a]">Session flags</strong> — e.g. &ldquo;gaze away&rdquo; or &ldquo;head tilt&rdquo;
              </span>
            </li>
          </ul>

          {/* What is NOT collected */}
          <div className="w-full bg-[#f5f5f5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">Not collected</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-xs leading-none">✕</span>
                <span className="text-xs text-[#737373]">No video ever leaves your device</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-xs leading-none">✕</span>
                <span className="text-xs text-[#737373]">No recordings or screenshots are taken</span>
              </li>
            </ul>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => setConsentGiven(true)}
            className="w-full py-2.5 px-4 bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Start Monitoring
          </button>

          {/* Decline path */}
          {cameraDeclined ? (
            <p className="text-xs text-[#737373] text-center leading-relaxed">
              Please notify your teacher so they can mark you as present manually.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setCameraDeclined(true)}
              className="text-[11px] text-[#a3a3a3] hover:text-[#737373] underline underline-offset-2 transition-colors"
            >
              I can&rsquo;t share my camera
            </button>
          )}
        </div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-status-green-bg flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-full max-w-sm bg-white border border-status-green-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <CheckCircle size={40} className="text-status-green-text" />
          <p className="text-sm font-semibold text-[#0a0a0a]">Session Ended</p>
          <p className="text-xs text-[#737373] leading-relaxed">
            This session has been stopped by your instructor. Thank you for participating.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
          <Eye size={14} strokeWidth={1.75} className="text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight text-[#0a0a0a]">Attend — Student View</span>
      </div>

      {/* Connection status pill */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e8e8] rounded-full">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {socketStatus === "joined" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green-pulse opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`} />
        </span>
        <span className={`text-xs font-medium ${textColor}`}>{statusText}</span>
      </div>

      {/* Camera */}
      <CameraFeed onStreamReady={onStreamReady} />

      {/* Status indicator */}
      {isRunning ? (
        <StatusIndicator score={score} flags={flags} status={status} />
      ) : cvError ? (
        <div className="card w-full max-w-sm p-5 text-center">
          <p className="text-xs font-semibold text-[#0a0a0a] mb-1">Face Detection Error</p>
          <p className="text-[11px] text-[#737373]">{cvError}</p>
        </div>
      ) : (
        <div className="card w-full max-w-sm p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#a3a3a3]" />
            <p className="text-xs text-[#a3a3a3]">Initializing face detection…</p>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="text-[11px] text-[#c8c8c8] text-center max-w-xs leading-relaxed">
        Your camera is processed locally in your browser.
        No video is ever transmitted or stored.
      </p>
    </div>
  );
}
