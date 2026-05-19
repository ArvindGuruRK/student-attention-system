import { getToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401 && auth) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("attention_token");
      localStorage.removeItem("attention_teacher");
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; teacher_id: string; name: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        false,
      ),
    register: (email: string, password: string, name: string) =>
      request<{ access_token: string; teacher_id: string; name: string }>(
        "/api/auth/register",
        { method: "POST", body: JSON.stringify({ email, password, name }) },
        false,
      ),
  },

  classrooms: {
    list: () => request<Classroom[]>("/api/classrooms"),
    get: (id: string) => request<Classroom>(`/api/classrooms/${id}`),
    create: (data: {
      name: string;
      yaw_threshold?: number;
      pitch_threshold?: number;
      alert_threshold?: number;
      warn_threshold?: number;
    }) =>
      request<Classroom>("/api/classrooms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Classroom>) =>
      request<Classroom>(`/api/classrooms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/classrooms/${id}`, { method: "DELETE" }),
  },

  students: {
    list: (classroomId: string) =>
      request<Student[]>(`/api/classrooms/${classroomId}/students`),
    add: (classroomId: string, name: string) =>
      request<Student>(`/api/classrooms/${classroomId}/students`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) => request<void>(`/api/students/${id}`, { method: "DELETE" }),
  },

  sessions: {
    start: (classroomId: string) =>
      request<Session>(`/api/sessions/start?classroom_id=${classroomId}`, { method: "POST" }),
    end: (id: string) => request<Session>(`/api/sessions/${id}/end`, { method: "POST" }),
    getStatus: (id: string) => request<Session>(`/api/sessions/${id}`),
    report: (id: string) => request<SessionReport>(`/api/sessions/${id}/report`),
    list: (classroomId: string) =>
      request<Session[]>(`/api/sessions/classrooms/${classroomId}/sessions`),
    exportCsvUrl: (id: string) => `${BASE}/api/sessions/${id}/export/csv`,
    join: (sessionId: string, name: string, rollNumber: string) =>
      request<StudentJoinResponse>(
        `/api/sessions/${sessionId}/join`,
        { method: "POST", body: JSON.stringify({ name, roll_number: rollNumber }) },
        false,
      ),
  },
};

// Shared types
export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  yaw_threshold: number;
  pitch_threshold: number;
  alert_threshold: number;
  warn_threshold: number;
  created_at: string;
}

export interface Student {
  id: string;
  classroom_id: string;
  name: string;
  session_token: string;
  created_at: string;
}

export interface Session {
  id: string;
  classroom_id: string;
  classroom_name: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface StudentJoinResponse {
  session_token: string;
  student_id: string;
  session_id: string;
}

export interface StudentSessionStats {
  student_id: string;
  student_name: string;
  avg_score: number;
  min_score: number;
  max_score: number;
  alert_count: number;
  top_flags: string[];
}

export interface SessionReport {
  session_id: string;
  classroom_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  class_avg: number;
  at_risk_count: number;
  student_stats: StudentSessionStats[];
  timeline: { minute: number; avg_score: number }[];
}
