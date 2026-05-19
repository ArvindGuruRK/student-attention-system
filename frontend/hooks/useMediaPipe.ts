"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

interface MediaPipeResult {
  score: number;
  flags: string[];
  isRunning: boolean;
  error: string | null;
}

const EMIT_INTERVAL_MS = 3000;
const YAW_THRESHOLD = 30;
const PITCH_THRESHOLD = 25;
const FACE_MESH_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";

// Module-level singleton so React Strict Mode's double-invoke shares one promise.
// Both effect runs await the same onload — no race between script-exists check and load.
let _scriptPromise: Promise<void> | null = null;

function loadMediaPipeScript(): Promise<void> {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    // Already loaded from a previous mount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).FaceMesh === "function") {
      console.log("[MP] window.FaceMesh already available");
      resolve();
      return;
    }
    console.log("[MP] Injecting CDN script:", FACE_MESH_CDN);
    const script = document.createElement("script");
    script.src = FACE_MESH_CDN;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      console.log("[MP] CDN script loaded successfully");
      resolve();
    };
    script.onerror = () => {
      _scriptPromise = null; // allow retry on next mount
      reject(new Error(`Failed to load MediaPipe from CDN: ${FACE_MESH_CDN}`));
    };
    document.head.appendChild(script);
  });
  return _scriptPromise;
}

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  sessionId: string,
  studentId: string,
  token: string,
): MediaPipeResult {
  const [score, setScore] = useState(100);
  const [flags, setFlags] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs so onResults always reads the latest session params without re-initializing
  const sessionIdRef = useRef(sessionId);
  const studentIdRef = useRef(studentId);
  const tokenRef = useRef(token);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    studentIdRef.current = studentId;
    tokenRef.current = token;
  }, [sessionId, studentId, token]);

  // Initialize MediaPipe exactly once on mount
  useEffect(() => {
    let stopped = false;
    let intervalId: NodeJS.Timeout | null = null;

    async function init() {
      console.log("[MP] Starting MediaPipe init...");
      try {
        // Load MediaPipe via CDN script tag — webpack cannot bundle this WASM package.
        // After the script loads, window.FaceMesh is the constructor.
        await loadMediaPipeScript();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const FaceMesh = (window as any).FaceMesh;
        if (typeof FaceMesh !== "function") {
          throw new Error(
            `FaceMesh not found on window after CDN load (got ${typeof FaceMesh}). ` +
            `Check browser console for script load errors or CSP violations.`
          );
        }
        console.log("[MP] window.FaceMesh found, constructing instance...");

        const fm = new FaceMesh({
          // CDN so WASM/model files load without copying them to public/
          locateFile: (file: string) => {
            const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
            console.log("[MP] locateFile →", url);
            return url;
          },
        });

        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        fm.onResults((results: unknown) => {
          if (stopped) return;

          const r = results as {
            multiFaceLandmarks?: { x: number; y: number; z: number }[][];
          };

          let newScore: number;
          let newFlags: string[];
          let newYaw: number | null = null;
          let newPitch: number | null = null;

          if (!r.multiFaceLandmarks || r.multiFaceLandmarks.length === 0) {
            newScore = 0;
            newFlags = ["no_face"];
          } else {
            const lm = r.multiFaceLandmarks[0];
            const noseTip  = lm[1];
            const leftEye  = lm[33];
            const rightEye = lm[263];
            const forehead = lm[10];
            const chin     = lm[152];

            const eyeWidth   = Math.abs(rightEye.x - leftEye.x) || 0.1;
            const faceHeight = Math.abs(chin.y - forehead.y)    || 0.1;
            const eyeMidX    = (leftEye.x + rightEye.x) / 2;
            const eyeMidY    = (leftEye.y + rightEye.y) / 2;

            newYaw   = Math.round(((noseTip.x - eyeMidX) / eyeWidth)   * 900) / 10;
            newPitch = Math.round(((noseTip.y - eyeMidY)  / faceHeight) * 900) / 10;

            newFlags = [];
            let s = 100;
            if (Math.abs(newYaw)   > YAW_THRESHOLD)   { s -= 50; newFlags.push("gaze_away"); }
            if (Math.abs(newPitch) > PITCH_THRESHOLD)  { s -= 30; newFlags.push("head_tilt"); }
            newScore = Math.max(0, s);
          }

          setScore(newScore);
          setFlags(newFlags);

          const sid = sessionIdRef.current;
          const uid = studentIdRef.current;
          if (sid && uid) {
            console.log(`[MP] signal → score=${newScore} flags=[${newFlags}] yaw=${newYaw} pitch=${newPitch}`);
            getSocket().emit("signal", {
              session_id: sid,
              student_id: uid,
              token: tokenRef.current,
              attention_score: newScore,
              flags: newFlags,
              yaw: newYaw,
              pitch: newPitch,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log(`[MP] score=${newScore} — waiting for session join`);
          }
        });

        if (stopped) return; // cleaned up before onload resolved (React Strict Mode run-1)
        console.log("[MP] FaceMesh ready, starting interval");
        setIsRunning(true);

        intervalId = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            console.log("[MP] video not ready (readyState=" + (video?.readyState ?? "null") + ")");
            return;
          }
          try {
            await fm.send({ image: video });
          } catch (e) {
            console.warn("[MP] send() error:", e);
          }
        }, EMIT_INTERVAL_MS);

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[MP] Init failed:", msg);
        if (!stopped) setError(msg);
      }
    }

    init();

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { score, flags, isRunning, error };
}
