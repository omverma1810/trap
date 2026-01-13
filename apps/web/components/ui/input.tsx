"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "flex w-full",
    "bg-bg-surface text-text-primary",
    "border border-border-default rounded-md",
    "px-4 py-3",
    "text-body placeholder:text-text-muted",
    "transition-all duration-fast ease-smooth",
    "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-1 focus:ring-offset-bg-primary focus:border-transparent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-elevated",
    "min-h-[44px]", // Touch target for POS
  ],
  {
    variants: {
      variant: {
        default: "",
        error: [
          "border-danger",
          "focus:ring-danger",
        ],
      },
      inputSize: {
        sm: "h-10 px-3 text-body-sm",
        md: "h-12 px-4 text-body",
        lg: "h-14 px-4 text-body-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant,
    inputSize,
    type = "text",
    error,
    label,
    helperText,
    id,
    ...props 
  }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = !!error;
    
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-body-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            inputVariants({ 
              variant: hasError ? "error" : variant, 
              inputSize,
              className 
            }),
            // Numeric inputs styling
            type === "number" && "font-mono tabular-nums"
          )}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
        {(helperText || error) && (
          <p 
            id={hasError ? `${inputId}-error` : undefined}
            className={cn(
              "text-caption",
              hasError ? "text-danger" : "text-text-muted"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
