"use client";

import * as React from "react";
import { Menu, Bell, ChevronDown, Search, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
}

export function TopBar({
  title,
  subtitle,
  onMenuClick,
  showWarehouseSelector = false,
  showDateRange = false,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "flex items-center justify-between",
        "h-16 px-4 lg:px-6",
        "bg-bg-primary/80 backdrop-blur-md",
        "border-b border-border-default"
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "lg:hidden p-2 -ml-2 rounded-md",
            "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          )}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <div>
          <h1 className="text-heading-sm font-semibold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-caption text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center Section - Optional Controls */}
      <div className="hidden md:flex items-center gap-3">
        {/* Warehouse Selector Placeholder */}
        {showWarehouseSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Building2 className="w-4 h-4" />
                <span>Main Warehouse</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
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
          <Button variant="secondary" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-2 rounded-md",
            "bg-bg-surface border border-border-default",
            "text-text-muted text-body-sm",
            "hover:border-border-hover transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          )}
        >
          <Search className="w-4 h-4" />
          <span className="hidden lg:inline">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-elevated text-caption">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className={cn(
            "relative p-2 rounded-md",
            "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          )}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-primary" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-md",
                "hover:bg-bg-elevated transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <span className="text-accent-primary text-body-sm font-medium">A</span>
              </div>
              <ChevronDown className="w-4 h-4 text-text-muted hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">Admin User</p>
                <p className="text-caption text-text-muted">admin@trap.io</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
