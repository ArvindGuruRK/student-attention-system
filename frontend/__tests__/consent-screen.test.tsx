/**
 * Tests for the camera consent gate on /student/[token]/page.tsx.
 * Verifies that the consent screen renders before camera activation,
 * and that clicking "Start Monitoring" shows the monitoring UI.
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok-xyz" }),
}));

const mockConnectStudent = vi.fn(() => mockSocket);
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("@/lib/socket", () => ({
  connectStudent: (...args: unknown[]) => mockConnectStudent(...args),
  getSocket: vi.fn(() => mockSocket),
}));

vi.mock("@/lib/api", () => ({
  api: {
    sessions: {
      getStatus: vi.fn().mockResolvedValue({
        id: "sess-1",
        classroom_id: "cls-1",
        classroom_name: "Test Class",
        started_at: "2025-01-01T00:00:00Z",
        ended_at: null,
      }),
    },
  },
}));

vi.mock("@/components/student/CameraFeed", () => ({
  CameraFeed: () => <div data-testid="camera-feed" />,
}));

vi.mock("@/components/student/StatusIndicator", () => ({
  StatusIndicator: () => <div data-testid="status-indicator" />,
}));

vi.mock("@/hooks/useMediaPipe", () => ({
  useMediaPipe: vi.fn(() => ({ score: 85, flags: [], isRunning: false, error: null })),
}));

import StudentPage from "@/app/student/[token]/page";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StudentPage — consent screen", () => {
  beforeEach(() => {
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockConnectStudent.mockClear();
  });

  it("shows consent screen before monitoring starts", () => {
    render(<StudentPage />);
    expect(screen.getByText("Start Monitoring")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-feed")).not.toBeInTheDocument();
  });

  it("explains what data is collected on the consent screen", () => {
    render(<StudentPage />);
    expect(screen.getByText(/head pose/i)).toBeInTheDocument();
  });

  it("does NOT connect socket before consent", () => {
    mockConnectStudent.mockClear();
    render(<StudentPage />);
    expect(mockConnectStudent).not.toHaveBeenCalled();
  });

  it("shows camera feed after clicking Start Monitoring", async () => {
    render(<StudentPage />);

    await act(async () => {
      fireEvent.click(screen.getByText("Start Monitoring"));
    });

    expect(screen.getByTestId("camera-feed")).toBeInTheDocument();
    expect(screen.queryByText("Start Monitoring")).not.toBeInTheDocument();
  });

  it("connects socket only after consent is given", async () => {
    mockConnectStudent.mockClear();
    render(<StudentPage />);
    expect(mockConnectStudent).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText("Start Monitoring"));
    });

    expect(mockConnectStudent).toHaveBeenCalledWith("tok-xyz");
  });

  it("shows declined message when student clicks the camera decline button", async () => {
    render(<StudentPage />);

    // Find by role since apostrophe encoding can vary across platforms
    const declineBtn = screen.getByRole("button", { name: /can.t share my camera/i });
    await act(async () => {
      fireEvent.click(declineBtn);
    });

    expect(screen.getByText(/notify your teacher/i)).toBeInTheDocument();
  });

  it("does not show camera feed if student declines camera", async () => {
    render(<StudentPage />);

    const declineBtn = screen.getByRole("button", { name: /can.t share my camera/i });
    await act(async () => {
      fireEvent.click(declineBtn);
    });

    expect(screen.queryByTestId("camera-feed")).not.toBeInTheDocument();
  });
});
