/**
 * Date Range Picker Component
 *
 * PHASE 17: Global dashboard filtering
 */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, X } from "lucide-react";

interface DateRangePickerProps {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
  className?: string;
}

// Preset ranges
const presets = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", type: "month" as const },
  { label: "Last month", type: "lastMonth" as const },
];

function getPresetDates(preset: (typeof presets)[number]) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (preset.type === "month") {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      from: firstDay.toISOString().split("T")[0],
      to: today.toISOString().split("T")[0],
    };
  }

  if (preset.type === "lastMonth") {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      from: firstDay.toISOString().split("T")[0],
      to: lastDay.toISOString().split("T")[0],
    };
  }

  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - (preset.days || 0));

  return {
    from: fromDate.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  };
}

function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return "Select dates";

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  if (from && to) {
    return `${formatDate(from)} - ${formatDate(to)}`;
  }

  return from ? `From ${formatDate(from)}` : `Until ${formatDate(to!)}`;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFrom, setLocalFrom] = React.useState(dateFrom || "");
  const [localTo, setLocalTo] = React.useState(dateTo || "");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync local state
  React.useEffect(() => {
    setLocalFrom(dateFrom || "");
    setLocalTo(dateTo || "");
  }, [dateFrom, dateTo]);

  const handlePreset = (preset: (typeof presets)[number]) => {
    const dates = getPresetDates(preset);
    setLocalFrom(dates.from);
    setLocalTo(dates.to);
    onChange(dates.from, dates.to);
    setIsOpen(false);
  };

  const handleApply = () => {
    onChange(localFrom || null, localTo || null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors"
      >
        <Calendar className="w-4 h-4 text-white/40" />
        <span>{formatDateRange(dateFrom, dateTo)}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-72 bg-[#1A1B23] border border-white/10 rounded-xl shadow-xl z-50"
          >
            {/* Presets */}
            <div className="p-3 border-b border-white/10">
              <p className="text-xs text-white/40 mb-2 font-medium">
                Quick select
              </p>
              <div className="grid grid-cols-2 gap-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className="px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 rounded transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">From</label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">To</label>
                <input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLocalFrom("");
                    setLocalTo("");
                    onChange(null, null);
                    setIsOpen(false);
                  }}
                  className="flex-1 px-3 py-2 text-xs text-white/60 hover:bg-white/5 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-3 py-2 bg-[#C6A15B] text-black text-xs font-medium rounded-lg hover:bg-[#C6A15B]/90 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DateRangePicker;
