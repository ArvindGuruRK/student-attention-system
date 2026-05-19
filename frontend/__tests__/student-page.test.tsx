/**
 * Tests for /student/[token]/page.tsx
 *
 * Covers:
 *  1. SESSION_ENDED socket event → renders ended screen
 *  2. Poll fallback: api.sessions.getStatus returns ended_at → renders ended screen
 *  3. Ended screen shows correct message and CheckCircle icon
 *  4. Normal connected state renders camera, not ended screen
 */

import { render, screen, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────

// next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-abc" }),
}));

// Socket factory — returns a controllable EventEmitter-style mock
const socketHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockSocket = {
  on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    socketHandlers[event] = socketHandlers[event] ?? [];
    socketHandlers[event].push(cb);
  }),
  off: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    socketHandlers[event] = (socketHandlers[event] ?? []).filter((h) => h !== cb);
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("@/lib/socket", () => ({
  connectStudent: vi.fn(() => mockSocket),
  getSocket: vi.fn(() => mockSocket),
}));

// api — default: session is active (no ended_at)
const mockGetStatus = vi.fn().mockResolvedValue({
  id: "session-123",
  classroom_id: "cls-1",
  classroom_name: "Test Class",
  started_at: "2025-01-01T00:00:00Z",
  ended_at: null,
});

vi.mock("@/lib/api", () => ({
  api: {
    sessions: {
      getStatus: (...args: unknown[]) => mockGetStatus(...args),
    },
  },
}));

// Heavy sub-components — stub to avoid camera/MediaPipe in tests
vi.mock("@/components/student/CameraFeed", () => ({
  CameraFeed: ({ onStreamReady }: { onStreamReady: (v: HTMLVideoElement) => void }) => (
    <div data-testid="camera-feed" />
  ),
}));

vi.mock("@/components/student/StatusIndicator", () => ({
  StatusIndicator: () => <div data-testid="status-indicator" />,
}));

vi.mock("@/hooks/useMediaPipe", () => ({
  useMediaPipe: vi.fn(() => ({ score: 85, flags: [], isRunning: true, error: null })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireSocketEvent(event: string, ...args: unknown[]) {
  const handlers = socketHandlers[event] ?? [];
  handlers.forEach((h) => h(...args));
}

// ── Component under test (imported AFTER mocks are set up) ────────────────────

// eslint-disable-next-line import/first
import StudentPage from "@/app/student/[token]/page";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StudentPage — SESSION_ENDED socket event", () => {
  beforeEach(() => {
    // Clear captured handlers between tests
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the ended screen when SESSION_ENDED fires", async () => {
    render(<StudentPage />);

    // Simulate SESSION_ENDED arriving from the server
    await act(async () => {
      fireSocketEvent("SESSION_ENDED");
    });

    expect(
      screen.getByText("This session has been stopped by your instructor. Thank you for participating."),
    ).toBeInTheDocument();
    expect(screen.getByText("Session Ended")).toBeInTheDocument();
  });

  it("does not show the ended screen before SESSION_ENDED fires", () => {
    render(<StudentPage />);

    expect(
      screen.queryByText("This session has been stopped by your instructor. Thank you for participating."),
    ).not.toBeInTheDocument();
  });

  it("registers and cleans up SESSION_ENDED listener", () => {
    const { unmount } = render(<StudentPage />);

    // on() should have been called with SESSION_ENDED
    expect(mockSocket.on).toHaveBeenCalledWith("SESSION_ENDED", expect.any(Function));

    unmount();

    // off() should have been called with the same handler reference
    const onCall = mockSocket.on.mock.calls.find(([ev]) => ev === "SESSION_ENDED");
    const offCall = mockSocket.off.mock.calls.find(([ev]) => ev === "SESSION_ENDED");
    expect(offCall).toBeDefined();
    expect(onCall?.[1]).toBe(offCall?.[1]);
  });

  it("hides the camera feed after session ends", async () => {
    render(<StudentPage />);

    // Camera is visible while session is active
    expect(screen.getByTestId("camera-feed")).toBeInTheDocument();

    await act(async () => {
      fireSocketEvent("SESSION_ENDED");
    });

    // Camera feed should be replaced by the ended screen
    expect(screen.queryByTestId("camera-feed")).not.toBeInTheDocument();
  });
});

describe("StudentPage — poll fallback (missed SESSION_ENDED)", () => {
  beforeEach(() => {
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockGetStatus.mockResolvedValue({
      id: "session-123",
      classroom_id: "cls-1",
      classroom_name: "Test Class",
      started_at: "2025-01-01T00:00:00Z",
      ended_at: null,
    });
  });

  it("shows ended screen when poll returns ended_at after 30s", async () => {
    // Simulate student joining so sessionId is set (poll only runs after join)
    mockGetStatus.mockResolvedValue({
      id: "session-123",
      classroom_id: "cls-1",
      classroom_name: "Test Class",
      started_at: "2025-01-01T00:00:00Z",
      ended_at: "2025-01-01T01:00:00Z", // session ended
    });

    render(<StudentPage />);

    // Trigger joined event so sessionId state is populated
    await act(async () => {
      fireSocketEvent("joined", { session_id: "session-123", student_id: "student-456" });
    });

    // Advance 30 seconds — vi.advanceTimersByTimeAsync also flushes async callbacks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(
      screen.getByText("This session has been stopped by your instructor. Thank you for participating."),
    ).toBeInTheDocument();
  });

  it("does not show ended screen when poll returns ended_at=null", async () => {
    mockGetStatus.mockResolvedValue({
      id: "session-123",
      classroom_id: "cls-1",
      classroom_name: "Test Class",
      started_at: "2025-01-01T00:00:00Z",
      ended_at: null,
    });

    render(<StudentPage />);

    await act(async () => {
      fireSocketEvent("joined", { session_id: "session-123", student_id: "student-456" });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(
      screen.queryByText("This session has been stopped by your instructor. Thank you for participating."),
    ).not.toBeInTheDocument();
  });

  it("stops polling once status is ended", async () => {
    mockGetStatus.mockResolvedValue({
      id: "session-123",
      classroom_id: "cls-1",
      classroom_name: "Test Class",
      started_at: "2025-01-01T00:00:00Z",
      ended_at: "2025-01-01T01:00:00Z",
    });

    render(<StudentPage />);

    await act(async () => {
      fireSocketEvent("joined", { session_id: "session-123", student_id: "student-456" });
    });

    // First poll fires at 30s — sets status to ended
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    const callsAfterFirst = mockGetStatus.mock.calls.length;

    // Advance another 30s — interval should be cleared since status="ended"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(mockGetStatus.mock.calls.length).toBe(callsAfterFirst);
  });
});
