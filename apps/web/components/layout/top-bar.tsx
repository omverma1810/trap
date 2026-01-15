"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, Search, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showWarehouseSelector?: boolean;
  showDateRange?: boolean;
  user?: User | null;
}

export function TopBar({
  title,
  subtitle,
  onMenuClick,
  showWarehouseSelector = false,
  showDateRange = false,
  user,
}: TopBarProps) {
  const router = useRouter();

  const handleSignOut = () => {
    // Future: Clear auth state
    router.push("/login");
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : "User";
  const displayEmail = user?.email || "";
  const initial = user?.firstName?.[0] || user?.username?.[0] || "U";

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "flex items-center justify-between",
        "h-16 px-4 lg:px-6",
        "bg-[#0E0F13]/90 backdrop-blur-xl",
        "border-b border-white/[0.08]"
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "lg:hidden p-2.5 -ml-2 rounded-lg",
            "text-[#A1A4B3] hover:bg-white/[0.05] hover:text-[#F5F6FA]",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]"
          )}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 stroke-[1.5]" />
        </button>

        {/* Page Title */}
        <div>
          <h1 className="text-xl font-semibold text-[#F5F6FA] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#6F7285] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center Section - Optional Controls */}
      <div className="hidden md:flex items-center gap-3">
        {/* Warehouse Selector Placeholder */}
        {showWarehouseSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
                <Building2 className="w-4 h-4 text-[#A1A4B3] stroke-[1.5]" />
                <span>Main Warehouse</span>
                <ChevronDown className="w-4 h-4 text-[#6F7285] stroke-[1.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Select Warehouse</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Main Warehouse</DropdownMenuItem>
              <DropdownMenuItem>Secondary Store</DropdownMenuItem>
              <DropdownMenuItem>Distribution Center</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Date Range Placeholder */}
        {showDateRange && (
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
            <Calendar className="w-4 h-4 text-[#A1A4B3] stroke-[1.5]" />
            <span>Last 30 Days</span>
            <ChevronDown className="w-4 h-4 text-[#6F7285] stroke-[1.5]" />
          </button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg",
            "bg-white/[0.05] border border-white/[0.08]",
            "text-[#6F7285] text-sm",
            "hover:bg-white/[0.08] hover:border-white/[0.12] transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]"
          )}
        >
          <Search className="w-4 h-4 stroke-[1.5]" />
          <span className="hidden lg:inline">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.08] text-xs text-[#A1A4B3]">
            ⌘K
          </kbd>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg",
                "hover:bg-white/[0.05] transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-[#C6A15B]/20 flex items-center justify-center ring-2 ring-[#C6A15B]/30">
                <span className="text-[#C6A15B] text-sm font-semibold">
                  {initial}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6F7285] hidden sm:block stroke-[1.5]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold text-[#F5F6FA]">{displayName}</p>
                <p className="text-xs text-[#6F7285] mt-0.5">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled
              className="opacity-50 cursor-not-allowed"
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-[#E74C3C]"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
