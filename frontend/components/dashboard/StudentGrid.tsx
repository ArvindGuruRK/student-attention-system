"use client";

import { Users } from "lucide-react";
import { StudentTile } from "./StudentTile";
import type { LiveStudent } from "@/hooks/useLiveSession";

interface StudentGridProps {
  students: Record<string, LiveStudent>;
}

const STATUS_PRIORITY: Record<string, number> = {
  alert: 0,
  at_risk: 1,
  distracted: 2,
  attentive: 3,
};

export function StudentGrid({ students }: StudentGridProps) {
  const sortedStudents = Object.values(students).sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 4) - (STATUS_PRIORITY[b.status] ?? 4)
  );

  if (sortedStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mb-4">
          <Users size={22} strokeWidth={1.5} className="text-[#c8c8c8]" />
        </div>
        <p className="text-sm font-medium text-[#a3a3a3]">Waiting for students…</p>
        <p className="text-xs text-[#c8c8c8] mt-1">Share the session join link to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      {sortedStudents.map((s, i) => (
        <div key={s.student_id} className="animate-in" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
          <StudentTile student={s} />
        </div>
      ))}
    </div>
  );
}
