"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-full px-2.5 py-0.5",
    "text-caption font-medium",
    "transition-colors duration-fast",
  ],
  {
    variants: {
      variant: {
        success: [
          "bg-success-muted text-success",
          "border border-success/20",
        ],
        warning: [
          "bg-warning-muted text-warning",
          "border border-warning/20",
        ],
        danger: [
          "bg-danger-muted text-danger",
          "border border-danger/20",
        ],
        neutral: [
          "bg-bg-elevated text-text-secondary",
          "border border-border-default",
        ],
        accent: [
          "bg-accent-primary/10 text-accent-primary",
          "border border-accent-primary/20",
        ],
      },
      size: {
        sm: "text-[10px] px-2 py-0",
        md: "text-caption px-2.5 py-0.5",
        lg: "text-body-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional dot indicator */
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span 
            className={cn(
              "w-1.5 h-1.5 rounded-full mr-1.5",
              variant === "success" && "bg-success",
              variant === "warning" && "bg-warning",
              variant === "danger" && "bg-danger",
              variant === "neutral" && "bg-text-muted",
              variant === "accent" && "bg-accent-primary",
            )}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
