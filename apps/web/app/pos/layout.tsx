"use client";

import Link from "next/link";
import { ArrowLeft, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      {/* POS Header - Minimal */}
      <header
        className={cn(
          "flex items-center justify-between",
          "h-14 px-4",
          "bg-bg-surface/50 backdrop-blur-sm",
          "border-b border-border-default"
        )}
      >
        {/* Left - Back & Brand */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-3 py-2 -ml-2 rounded-md",
              "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
              "transition-colors duration-fast"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-body-sm hidden sm:inline">Exit POS</span>
          </Link>
          
          <div className="h-6 w-px bg-border-default" />
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-primary flex items-center justify-center">
              <span className="text-bg-primary font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-text-primary">TRAP POS</span>
          </div>
        </div>

        {/* Center - Warehouse */}
        <div className="flex items-center gap-2 text-body-sm">
          <Building2 className="w-4 h-4 text-text-muted" />
          <span className="text-text-secondary">Main Warehouse</span>
        </div>

        {/* Right - User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-accent-primary" />
          </div>
        </div>
      </header>

      {/* POS Content - Full Width */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
