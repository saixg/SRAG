import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'subtle' | 'interactive' | 'blue' | 'violet' | 'teal';
  isGlow?: boolean;
  hover?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  isGlow = false,
  hover = false,
  title,
  subtitle,
  action,
  className,
  ...props
}) => {
  const baseStyles = "rounded-2xl border transition-all duration-200 p-5";

  const variantStyles = {
    default: "bg-[#111A2E]/90 border-[#22375F] shadow-lg shadow-black/20",
    surface: "bg-[#15223D] border-[#22375F] shadow-md",
    subtle: "bg-[#1C2D4F]/40 border-[#22375F]/60",
    interactive: "bg-[#111A2E]/90 border-[#22375F] hover:border-[#4F7CFF]/60 hover:bg-[#15223D] hover:shadow-blue-950/20 cursor-pointer shadow-lg",
    blue: "bg-gradient-to-b from-[#142347] to-[#111A2E] border-[#4F7CFF]/40 shadow-lg shadow-blue-950/30",
    violet: "bg-gradient-to-b from-[#211642] to-[#111A2E] border-[#8B6CFF]/40 shadow-lg shadow-purple-950/30",
    teal: "bg-gradient-to-b from-[#102d33] to-[#111A2E] border-[#21C7A8]/40 shadow-lg shadow-teal-950/30",
  };

  const hoverStyles = hover ? "hover:border-slate-700 hover:shadow-xl hover:-translate-y-0.5" : "";
  const glowStyles = isGlow ? "relative before:absolute before:-inset-0.5 before:bg-gradient-to-r before:from-[#4F7CFF] before:to-[#8B6CFF] before:rounded-2xl before:blur-sm before:opacity-30 before:-z-10" : "";

  return (
    <div className={twMerge(clsx(baseStyles, variantStyles[variant], hoverStyles, glowStyles, className))} {...props}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
