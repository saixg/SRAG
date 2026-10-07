import React from 'react';
import { Loader2, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  isSuccess?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  isSuccess = false,
  leftIcon,
  rightIcon,
  icon,
  className,
  disabled,
  ...props
}) => {
  const actualLoading = isLoading || loading;
  const actualLeftIcon = leftIcon || icon;

  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5",
  };

  const variantStyles = {
    primary: "bg-gradient-to-r from-[#4F7CFF] to-[#2563EB] hover:from-[#3B82F6] hover:to-[#1D4ED8] text-white font-semibold shadow-md shadow-blue-900/30 border border-blue-400/30",
    secondary: "bg-[#15223D] hover:bg-[#1C2D4F] text-slate-200 border border-[#22375F] hover:border-slate-500",
    outline: "bg-transparent border border-[#4F7CFF]/50 text-[#4F7CFF] hover:bg-[#4F7CFF]/10 hover:border-[#4F7CFF]",
    ghost: "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
    danger: "bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-md shadow-rose-950/40 border border-rose-500/40",
    success: "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-950/40 border border-emerald-500/40",
    violet: "bg-gradient-to-r from-[#8B6CFF] to-[#6D28D9] hover:from-[#9D80FF] hover:to-[#5B21B6] text-white font-semibold shadow-md shadow-purple-900/30 border border-purple-400/30"
  };

  return (
    <button
      disabled={disabled || actualLoading}
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {actualLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : isSuccess ? (
        <Check className="w-4 h-4 text-emerald-300 shrink-0" />
      ) : (
        actualLeftIcon
      )}
      {children && <span>{children}</span>}
      {!actualLoading && !isSuccess && rightIcon}
    </button>
  );
};
