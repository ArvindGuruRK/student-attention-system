/**
 * Tests for StudentGrid alert-first sorting.
 * Verifies that students are ordered: alert → at_risk → distracted → attentive.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StudentGrid } from "@/components/dashboard/StudentGrid";
import type { LiveStudent } from "@/hooks/useLiveSession";

// Stub StudentTile so we can assert render order via data-testid
vi.mock("@/components/dashboard/StudentTile", () => ({
  StudentTile: ({ student }: { student: LiveStudent }) => (
    <div data-testid={`tile-${student.student_id}`} data-status={student.status}>
      {student.student_name}
    </div>
  ),
}));

function makeStudent(
  id: string,
  name: string,
  status: LiveStudent["status"],
  score = 50,
): LiveStudent {
  return {
    student_id: id,
    student_name: name,
    status,
    attention_score: score,
    flags: [],
    trend: "stable",
  };
}

describe("StudentGrid — alert-first sorting", () => {
  it("renders attentive students last when mixed statuses present", () => {
    const students: Record<string, LiveStudent> = {
      s1: makeStudent("s1", "Attentive Alice", "attentive", 90),
      s2: makeStudent("s2", "Alert Bob", "alert", 20),
    };

    render(<StudentGrid students={students} />);

    const tiles = screen.getAllByTestId(/^tile-/);
    expect(tiles[0]).toHaveAttribute("data-status", "alert");
    expect(tiles[1]).toHaveAttribute("data-status", "attentive");
  });

  it("sorts four statuses in correct priority order", () => {
    const students: Record<string, LiveStudent> = {
      s1: makeStudent("s1", "Attentive", "attentive", 90),
      s2: makeStudent("s2", "Distracted", "distracted", 65),
      s3: makeStudent("s3", "Alert", "alert", 20),
      s4: makeStudent("s4", "AtRisk", "at_risk", 45),
    };

    render(<StudentGrid students={students} />);

    const tiles = screen.getAllByTestId(/^tile-/);
    const statuses = tiles.map((t) => t.getAttribute("data-status"));
    expect(statuses).toEqual(["alert", "at_risk", "distracted", "attentive"]);
  });

  it("preserves relative order for students with the same status", () => {
    const students: Record<string, LiveStudent> = {
      s1: makeStudent("s1", "Alice", "alert", 10),
      s2: makeStudent("s2", "Bob", "alert", 15),
      s3: makeStudent("s3", "Carol", "attentive", 95),
    };

    render(<StudentGrid students={students} />);

    const tiles = screen.getAllByTestId(/^tile-/);
    const statuses = tiles.map((t) => t.getAttribute("data-status"));
    expect(statuses[0]).toBe("alert");
    expect(statuses[1]).toBe("alert");
    expect(statuses[2]).toBe("attentive");
  });

  it("renders all attentive grid when everyone is attentive", () => {
    const students: Record<string, LiveStudent> = {
      s1: makeStudent("s1", "Alice", "attentive", 95),
      s2: makeStudent("s2", "Bob", "attentive", 88),
    };

    render(<StudentGrid students={students} />);

    const tiles = screen.getAllByTestId(/^tile-/);
    tiles.forEach((t) => expect(t).toHaveAttribute("data-status", "attentive"));
  });

  it("shows empty state when no students", () => {
    render(<StudentGrid students={{}} />);
    expect(screen.getByText("Waiting for students…")).toBeInTheDocument();
  });

  it("places a single alert student first among many attentive students", () => {
    const students: Record<string, LiveStudent> = {
      s1: makeStudent("s1", "A", "attentive", 90),
      s2: makeStudent("s2", "B", "attentive", 88),
      s3: makeStudent("s3", "C", "alert", 15),
      s4: makeStudent("s4", "D", "attentive", 92),
    };

    render(<StudentGrid students={students} />);

    const tiles = screen.getAllByTestId(/^tile-/);
    expect(tiles[0]).toHaveAttribute("data-status", "alert");
  });
});
