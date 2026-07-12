"use client";

import { useEffect, useRef, useState } from "react";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";

const DETECTION_INTERVAL_MS = 3000;
const CONFIDENCE_THRESHOLD = 0.5;
// Require N consecutive detections to suppress transient false positives
const CONSECUTIVE_REQUIRED = 3;

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
      return cocoSsd.load();
    })();
  }
  return _modelPromise;
}

interface PhoneDetectorResult {
  isPhoneDetected: boolean;
  isModelLoaded: boolean;
}

export function usePhoneDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
): PhoneDetectorResult {
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const consecutiveRef = useRef(0);

  useEffect(() => {
    let stopped = false;
    let intervalId: NodeJS.Timeout | null = null;

    async function init() {
      try {
        const model = await getModel();
        if (stopped) return;
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
              consecutiveRef.current = 0;
            }
            setIsPhoneDetected(consecutiveRef.current >= CONSECUTIVE_REQUIRED);
          } catch (e) {
            console.warn("[PhoneDetector] detect() error:", e);
          }
        }, DETECTION_INTERVAL_MS);
      } catch (e) {
        console.warn("[PhoneDetector] model load failed:", e);
        if (!stopped) _modelPromise = null; // allow retry on next mount
      }
    }

    init();

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isPhoneDetected, isModelLoaded };
}
