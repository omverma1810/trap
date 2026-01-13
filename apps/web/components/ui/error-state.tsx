"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  message = "Something went wrong", 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#E74C3C]/10 mb-4">
        <AlertTriangle className="w-7 h-7 text-[#E74C3C]" />
      </div>
      <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">Error</h3>
      <p className="text-sm text-[#A1A4B3] mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] hover:bg-white/[0.08] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
