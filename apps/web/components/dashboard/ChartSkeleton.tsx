/**
 * Chart Skeleton Component
 * 
 * PHASE 17: Loading state for charts
 */
"use client";

import { motion } from "framer-motion";

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className = "" }: ChartSkeletonProps) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 ${className}`}
      style={{ height }}
    >
      <div className="animate-pulse h-full flex flex-col">
        {/* Title skeleton */}
        <div className="h-5 bg-white/10 rounded w-40 mb-4"></div>
        
        {/* Chart area skeleton */}
        <div className="flex-1 flex items-end gap-2 pb-4">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-white/10 rounded-t"
              style={{ height: `${20 + Math.random() * 60}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            />
          ))}
        </div>
        
        {/* X-axis labels skeleton */}
        <div className="flex justify-between">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 bg-white/10 rounded w-10"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChartSkeleton;
