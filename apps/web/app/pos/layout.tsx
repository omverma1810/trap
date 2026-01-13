"use client";

import Link from "next/link";
import { ArrowLeft, Building2, User } from "lucide-react";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0E0F13]">
      {/* POS Header - Minimal */}
      <header className="flex items-center justify-between h-14 px-4 bg-[#1A1B23]/80 backdrop-blur-xl border-b border-white/[0.08]">
        {/* Left - Back & Brand */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-lg text-[#A1A4B3] hover:bg-white/[0.05] hover:text-[#F5F6FA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
            <span className="text-sm hidden sm:inline">Exit POS</span>
          </Link>
          
          <div className="h-6 w-px bg-white/[0.08]" />
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C6A15B] flex items-center justify-center">
              <span className="text-[#0E0F13] font-bold text-sm">T</span>
            </div>
            <span className="font-semibold text-[#F5F6FA]">TRAP POS</span>
          </div>
        </div>

        {/* Center - Warehouse */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-[#6F7285] stroke-[1.5]" />
          <span className="text-[#A1A4B3]">Main Warehouse</span>
        </div>

        {/* Right - User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#C6A15B]/20 flex items-center justify-center ring-2 ring-[#C6A15B]/30">
            <User className="w-4 h-4 text-[#C6A15B] stroke-[1.5]" />
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
