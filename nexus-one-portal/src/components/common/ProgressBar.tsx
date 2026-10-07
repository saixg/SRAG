import React from 'react';
import { clsx } from 'clsx';

export interface ProgressBarProps {
  progress: number; // 0 - 100
  color?: 'blue' | 'violet' | 'teal' | 'emerald' | 'amber' | 'green';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'blue',
  size = 'md',
  showLabel = false,
  showValue = false
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const shouldShowLabel = showLabel || showValue;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colorClasses = {
    blue: 'bg-gradient-to-r from-[#4F7CFF] to-[#27D8E8]',
    violet: 'bg-gradient-to-r from-[#8B6CFF] to-[#A78BFA]',
    teal: 'bg-gradient-to-r from-[#21C7A8] to-[#34D399]',
    emerald: 'bg-gradient-to-r from-[#38C98A] to-[#10B981]',
    green: 'bg-gradient-to-r from-[#38C98A] to-[#10B981]',
    amber: 'bg-gradient-to-r from-[#F5B84B] to-[#FBBF24]',
  };

  return (
    <div className="w-full">
      {shouldShowLabel && (
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
          <span>Progress</span>
          <span className="text-white font-semibold">{clamped}%</span>
        </div>
      )}
      <div className={clsx("w-full bg-[#1C2D4F] rounded-full overflow-hidden p-0.5", heightClasses[size])}>
        <div
          className={clsx("h-full rounded-full transition-all duration-500", colorClasses[color] || colorClasses.blue)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
