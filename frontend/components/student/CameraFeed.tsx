"use client";

import { useEffect, useRef } from "react";

interface CameraFeedProps {
  onStreamReady: (video: HTMLVideoElement) => void;
}

export function CameraFeed({ onStreamReady }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
          onStreamReady(videoRef.current);
        }
      })
      .catch((e) => console.error("Camera access denied:", e));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onStreamReady]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Camera frame */}
      <div className="absolute inset-0 rounded-2xl border-2 border-[#e8e8e8] pointer-events-none z-10" />
      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#0a0a0a] rounded-tl-lg z-20 pointer-events-none" />
      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#0a0a0a] rounded-tr-lg z-20 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#0a0a0a] rounded-bl-lg z-20 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#0a0a0a] rounded-br-lg z-20 pointer-events-none" />

      <video
        ref={videoRef}
        className="w-full rounded-2xl bg-[#f5f5f5] aspect-[4/3] object-cover"
        playsInline
        muted
      />
    </div>
  );
}
