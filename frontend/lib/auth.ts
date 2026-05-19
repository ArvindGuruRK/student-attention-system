"use client";

const TOKEN_KEY = "attention_token";
const TEACHER_KEY = "attention_teacher";

export interface TeacherInfo {
  teacher_id: string;
  name: string;
}

export function saveAuth(token: string, teacher: TeacherInfo): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getTeacher(): TeacherInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TEACHER_KEY);
  return raw ? (JSON.parse(raw) as TeacherInfo) : null;
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TEACHER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
