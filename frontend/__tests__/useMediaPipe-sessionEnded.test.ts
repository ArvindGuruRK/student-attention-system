/**
 * Tests for the sessionEnded guard in useMediaPipe.
 *
 * Verifies that when sessionEnded=true is passed to the hook,
 * no "signal" events are emitted via Socket.io regardless of face-mesh results.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Socket mock ───────────────────────────────────────────────────────────────

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: vi.fn(() => ({ emit: mockEmit })),
  connectStudent: vi.fn(() => ({ emit: mockEmit, on: vi.fn(), off: vi.fn() })),
}));

// ── MediaPipe CDN mock ────────────────────────────────────────────────────────
// The hook loads FaceMesh from CDN via a <script> tag and calls window.FaceMesh.
// We stub the full init path so the hook behaves as if CDN is available in jsdom.

let capturedOnResults: ((results: unknown) => void) | null = null;

const mockFmInstance = {
  setOptions: vi.fn(),
  onResults: vi.fn((cb: (results: unknown) => void) => {
    capturedOnResults = cb;
  }),
  send: vi.fn(async () => {
    if (capturedOnResults) {
      // Simulate FaceMesh calling onResults with a face detected (straight-on)
      capturedOnResults({
        multiFaceLandmarks: [
          Array.from({ length: 264 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
        ],
      });
    }
  }),
};

function makeFaceMeshConstructor() {
  // Must be a regular function — arrow functions cannot be used with `new`
  return function FaceMesh() { return mockFmInstance; };
}

beforeEach(() => {
  capturedOnResults = null;
  mockEmit.mockClear();
  mockFmInstance.onResults.mockClear();
  mockFmInstance.send.mockClear();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).FaceMesh = makeFaceMeshConstructor();

  // Stub document.head.appendChild so CDN <script> "loads" instantly
  vi.spyOn(document.head, "appendChild").mockImplementation((el) => {
    const script = el as HTMLScriptElement;
    if (script.tagName === "SCRIPT" && typeof script.onload === "function") {
      script.onload(new Event("load"));
    }
    return el;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset module-level singleton (_scriptPromise) so each test gets fresh init
  vi.resetModules();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeVideoRef(): React.RefObject<HTMLVideoElement> {
  const video = document.createElement("video");
  Object.defineProperty(video, "readyState", { value: 4, configurable: true });
  return { current: video } as React.RefObject<HTMLVideoElement>;
}

async function waitForInit() {
  // Give the async init() function time to complete in the real microtask queue
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useMediaPipe — sessionEnded guard", () => {
  it("emits signal when sessionEnded=false and session is joined", async () => {
    const { useMediaPipe } = await import("@/hooks/useMediaPipe");
    const videoRef = makeVideoRef();

    renderHook(() =>
      useMediaPipe(videoRef, "session-1", "student-1", "token-abc", false),
    );

    await waitForInit();

    // Manually trigger a face-mesh frame
    await act(async () => {
      await mockFmInstance.send();
    });

    expect(mockEmit).toHaveBeenCalledWith(
      "signal",
      expect.objectContaining({
        session_id: "session-1",
        student_id: "student-1",
        token: "token-abc",
      }),
    );
  });

  it("does NOT emit signal when sessionEnded=true", async () => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).FaceMesh = makeFaceMeshConstructor();
    const { useMediaPipe } = await import("@/hooks/useMediaPipe");
    const videoRef = makeVideoRef();

    renderHook(() =>
      useMediaPipe(videoRef, "session-1", "student-1", "token-abc", true),
    );

    await waitForInit();

    await act(async () => {
      await mockFmInstance.send();
    });

    const signalCalls = mockEmit.mock.calls.filter(([ev]) => ev === "signal");
    expect(signalCalls).toHaveLength(0);
  });

  it("stops emitting after sessionEnded transitions false → true", async () => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).FaceMesh = makeFaceMeshConstructor();
    const { useMediaPipe } = await import("@/hooks/useMediaPipe");
    const videoRef = makeVideoRef();
    let sessionEnded = false;

    const { rerender } = renderHook(() =>
      useMediaPipe(videoRef, "session-1", "student-1", "token-abc", sessionEnded),
    );

    await waitForInit();

    // First frame — sessionEnded=false → signal should be emitted
    await act(async () => {
      await mockFmInstance.send();
    });

    const callsBeforeEnd = mockEmit.mock.calls.filter(([ev]) => ev === "signal").length;
    expect(callsBeforeEnd).toBeGreaterThan(0);

    // Transition to ended and re-render so the ref updates
    sessionEnded = true;
    rerender();

    mockEmit.mockClear();

    // Second frame — sessionEnded=true → no signal
    await act(async () => {
      await mockFmInstance.send();
    });

    expect(mockEmit.mock.calls.filter(([ev]) => ev === "signal")).toHaveLength(0);
  });
});
