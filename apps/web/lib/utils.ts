import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Theme configuration
 */
export const theme = {
  colors: {
    bg: {
      primary: "var(--bg-primary)",
      surface: "var(--bg-surface)",
      elevated: "var(--bg-elevated)",
    },
    text: {
      primary: "var(--text-primary)",
      secondary: "var(--text-secondary)",
      muted: "var(--text-muted)",
    },
    accent: {
      primary: "var(--accent-primary)",
      secondary: "var(--accent-secondary)",
    },
    semantic: {
      success: "var(--success)",
      warning: "var(--warning)",
      danger: "var(--danger)",
    },
  },
  
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  },
};
