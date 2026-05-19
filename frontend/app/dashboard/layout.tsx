"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getTeacher, isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const teacher = getTeacher();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  if (!isAuthenticated()) return null;

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Top navbar */}
      <Navbar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        teacher={teacher}
        onLogout={logout}
      />

      {/* Left sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen pt-14 transition-all duration-300 ease-in-out",
          collapsed ? "ml-16" : "ml-[220px]"
        )}
      >
        <div className="p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
