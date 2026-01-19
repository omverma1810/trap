/**
 * Section Card Component
 *
 * PHASE 17: Container for dashboard sections
 */
"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-0">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-white/5 rounded-lg">
              <Icon className="w-5 h-5 text-[#C6A15B]" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && (
              <p className="text-sm text-white/40 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export default SectionCard;
