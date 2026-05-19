"use client";

import { Eye, PanelLeft, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { TeacherInfo } from "@/lib/auth";

interface NavbarProps {
  collapsed: boolean;
  onToggle: () => void;
  teacher: TeacherInfo | null;
  onLogout: () => void;
}

function getInitials(name: string | undefined): string {
  if (!name) return "T";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Navbar({ collapsed, onToggle, teacher, onLogout }: NavbarProps) {
  const initials = getInitials(teacher?.name);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e8e8e8] flex items-center z-30 px-4 gap-3">
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "text-[#737373] hover:text-[#0a0a0a] transition-all duration-200",
          collapsed && "rotate-0"
        )}
      >
        <PanelLeft
          size={16}
          strokeWidth={1.75}
          className={cn(
            "transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </Button>

      {/* Brand */}
      <div className="flex items-center gap-2 mr-auto">
        <div className="w-6 h-6 bg-[#0a0a0a] rounded-md flex items-center justify-center shrink-0">
          <Eye size={11} strokeWidth={2} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-[#0a0a0a]">
          Attend
        </span>
        <span className="hidden sm:block text-[#d4d4d4] text-sm">·</span>
        <span className="hidden sm:block text-xs text-[#a3a3a3] font-medium">
          Classroom Monitor
        </span>
      </div>

      {/* User profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl",
              "hover:bg-[#f5f5f5] transition-colors duration-150 focus:outline-none",
              "border border-transparent hover:border-[#e8e8e8]"
            )}
          >
            {/* Avatar */}
            <div className="h-7 w-7 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-semibold tracking-wide">
                {initials}
              </span>
            </div>
            {/* Name */}
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-[#0a0a0a] leading-tight max-w-[120px] truncate">
                {teacher?.name ?? "Teacher"}
              </p>
              <p className="text-[10px] text-[#a3a3a3] leading-tight">Teacher</p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel className="px-3 py-2">
            <p className="text-xs font-semibold text-[#0a0a0a] truncate">
              {teacher?.name ?? "Teacher"}
            </p>
            <p className="text-[10px] text-[#a3a3a3] font-normal mt-0.5">Teacher account</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2.5 text-[#525252]">
            <User size={13} strokeWidth={1.75} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 text-[#525252]">
            <Settings size={13} strokeWidth={1.75} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="gap-2.5 text-[#ef4444] focus:bg-red-50 focus:text-[#ef4444]"
          >
            <LogOut size={13} strokeWidth={1.75} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
