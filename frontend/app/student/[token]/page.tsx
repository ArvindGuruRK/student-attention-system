"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { CameraFeed } from "@/components/student/CameraFeed";
import { StatusIndicator } from "@/components/student/StatusIndicator";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { connectStudent } from "@/lib/socket";
import { scoreToStatus } from "@/lib/utils";

type SocketStatus = "connecting" | "connected" | "joined" | "error";

export default function StudentPage() {
  const { token } = useParams<{ token: string }>();
  const [sessionId, setSessionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [socketError, setSocketError] = useState("");

  useEffect(() => {
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

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("joined", onJoined);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("joined", onJoined);
      socket.off("error", onError);
    };
  }, [token]);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const onStreamReady = useCallback((v: HTMLVideoElement) => {
    videoElementRef.current = v;
  }, []);

  const { score, flags, isRunning, error: cvError } = useMediaPipe(
    videoElementRef as React.RefObject<HTMLVideoElement>,
    sessionId,
    studentId,
    token,
  );

  const status = scoreToStatus(score);

  const statusConfig: Record<SocketStatus, { text: string; dot: string }> = {
    connecting: { text: "Connecting to server…", dot: "bg-[#d4d4d4] animate-pulse" },
    connected:  { text: "Joining session…",       dot: "bg-[#737373] animate-pulse" },
    joined:     { text: "Session active",          dot: "bg-[#0a0a0a]" },
    error:      { text: socketError || "Connection error", dot: "bg-[#0a0a0a]" },
  };

  const { text: statusText, dot: dotClass } = statusConfig[socketStatus];

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
        {socketStatus === "joined" ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]" />
          </span>
        ) : (
          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`} />
        )}
        <span className="text-xs font-medium text-[#525252]">{statusText}</span>
      </div>

      {/* Camera */}
      <CameraFeed onStreamReady={onStreamReady} />

      {/* Status indicator */}
      {isRunning ? (
        <StatusIndicator score={score} flags={flags} status={status} />
      ) : cvError ? (
        <div className="w-full max-w-sm bg-white border border-[#e8e8e8] rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-[#0a0a0a] mb-1">Face Detection Error</p>
          <p className="text-[11px] text-[#737373]">{cvError}</p>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-white border border-[#e8e8e8] rounded-2xl p-5 text-center">
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
