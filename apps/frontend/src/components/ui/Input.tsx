'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff, Search, AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'search';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const isSearch = variant === 'search';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {(leftIcon || isSearch) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">
              {isSearch ? <Search className="w-4 h-4" /> : leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-white border border-charcoal-200
              text-charcoal-900 placeholder:text-charcoal-400
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-charcoal-50
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              ${leftIcon || isSearch ? 'pl-10' : ''}
              ${rightIcon || isPassword ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-charcoal-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
