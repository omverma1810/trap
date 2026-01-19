/**
 * Empty State Component
 * 
 * PHASE 17: Display when no data is available
 * Empty state ≠ zero. Explains why data is missing.
 */
"use client";

import { motion } from "framer-motion";
import { LucideIcon, FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileQuestion,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="p-4 bg-white/5 rounded-full mb-4">
        <Icon className="w-8 h-8 text-white/30" />
      </div>
      
      <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-md">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white/80 transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

export default EmptyState;
