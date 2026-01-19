/**
 * KPI Card Component
 *
 * PHASE 17: Display large metrics with labels
 * No calculations - displays API-derived values only
 */
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { LucideIcon, Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  tooltip?: string;
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  tooltip,
  loading = false,
  className = "",
}: KPICardProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  if (loading) {
    return (
      <div
        className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
          <div className="h-8 bg-white/10 rounded w-32 mb-2"></div>
          <div className="h-3 bg-white/10 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60 font-medium">{title}</span>
          {tooltip && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="p-0.5 text-white/30 hover:text-white/50 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-[#1A1B23] border border-white/10 rounded-lg shadow-lg z-50 w-48">
                  <p className="text-xs text-white/70 leading-relaxed">
                    {tooltip}
                  </p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[#1A1B23] border-r border-b border-white/10 transform rotate-45 -mt-1"></div>
                </div>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-white/5 rounded-lg">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-white tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>

        {subtitle && <p className="text-sm text-white/40">{subtitle}</p>}

        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className={`text-xs font-medium ${
                trend.value >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-white/40">{trend.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default KPICard;
