"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, School, Clock, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutGrid },
  { href: "/dashboard/classrooms", label: "Classrooms", icon: School     },
  { href: "/dashboard/sessions",   label: "Sessions",   icon: Clock      },
  { href: "/dashboard/settings",   label: "Settings",   icon: Settings2  },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-14 left-0 h-[calc(100vh-56px)] bg-white border-r border-[#e8e8e8] flex flex-col z-20 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-[220px]"
      )}
    >
      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (pathname.startsWith(href + "/") && href !== "/dashboard");

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 select-none",
                "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]",
                isActive && "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] hover:text-white shadow-sm shadow-black/10",
                collapsed
                  ? "justify-center h-10 w-10 mx-auto"
                  : "px-3 py-2.5"
              )}
            >
              <Icon
                size={15}
                strokeWidth={1.75}
                className={cn(
                  "shrink-0",
                  isActive ? "text-white" : "text-[#a3a3a3] group-hover:text-[#0a0a0a]"
                )}
                style={{ color: isActive ? "#ffffff" : undefined }}
              />
              {!collapsed && (
                <span className="whitespace-nowrap">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom divider hint when collapsed */}
      {collapsed && (
        <div className="mx-3 mb-3 h-px bg-[#f0f0f0]" />
      )}
    </aside>
  );
}
