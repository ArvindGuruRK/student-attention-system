"use client";

import { useEffect, useRef, useState } from "react";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";

const DETECTION_INTERVAL_MS = 3000;
// lite model scores "cell phone" low (0.3-0.55) on webcam frames — 0.5 misses real phones
const CONFIDENCE_THRESHOLD = 0.35;
// Require N net detections to suppress transient false positives
const CONSECUTIVE_REQUIRED = 2;

// Module-level cache so the model loads once and survives React Strict Mode remounts
let _modelPromise: Promise<ObjectDetection> | null = null;

async function getModel(): Promise<ObjectDetection> {
  if (!_modelPromise) {
    // Assign synchronously before any await to prevent a concurrent second load
    _modelPromise = (async () => {
      const [tf, cocoSsd] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/coco-ssd"),
      ]);
      await tf.ready();
      // mobilenet_v2 base: markedly better small-object recall than the lite default,
      // affordable at one inference per 3s
      return cocoSsd.load({ base: "mobilenet_v2" });
    })();
  }
  return _modelPromise;
}

interface PhoneDetectorResult {
  isPhoneDetected: boolean;
  isModelLoaded: boolean;
  loadError: string | null;
}

export function usePhoneDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
): PhoneDetectorResult {
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const consecutiveRef = useRef(0);

  useEffect(() => {
    let stopped = false;
    let intervalId: NodeJS.Timeout | null = null;

    async function init() {
      try {
        const model = await getModel();
        if (stopped) return;
        console.log("[PhoneDetector] model loaded (mobilenet_v2), starting detection loop");
        setIsModelLoaded(true);

        intervalId = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          try {
            const predictions = await model.detect(video);
            const seen = predictions.some(
              (p) => p.class === "cell phone" && p.score >= CONFIDENCE_THRESHOLD,
            );
            if (seen) {
              consecutiveRef.current += 1;
            } else {
              // Decay instead of hard reset so one flaky frame doesn't erase progress
              consecutiveRef.current = Math.max(0, consecutiveRef.current - 1);
            }
            setIsPhoneDetected(consecutiveRef.current >= CONSECUTIVE_REQUIRED);
            console.log(
              "[PhoneDetector]",
              predictions.length
                ? predictions.map((p) => `${p.class}:${p.score.toFixed(2)}`).join(", ")
                : "no objects",
              `→ seen=${seen} consecutive=${consecutiveRef.current}`,
            );
          } catch (e) {
            console.warn("[PhoneDetector] detect() error:", e);
          }
        }, DETECTION_INTERVAL_MS);
      } catch (e) {
        console.warn("[PhoneDetector] model load failed:", e);
        if (!stopped) {
          _modelPromise = null; // allow retry on next mount
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    init();

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isPhoneDetected, isModelLoaded, loadError };
}
