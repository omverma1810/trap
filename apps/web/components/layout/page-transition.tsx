"use client";

import { motion } from "framer-motion";
import { motion as motionTokens } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: motionTokens.duration.medium,
        ease: motionTokens.easing.smooth,
      }}
    >
      {children}
    </motion.div>
  );
}
