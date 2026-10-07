import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  accentColor?: 'blue' | 'violet' | 'teal' | 'amber' | 'green';
  subtext?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  delta,
  deltaType = 'positive',
  icon,
  accentColor = 'blue',
  subtext,
  actionLabel,
  onAction
}) => {
  const [displayValue, setDisplayValue] = useState<number | string>(
    typeof value === 'number' ? 0 : value
  );

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 500;
      const stepTime = 20;
      const stepCount = duration / stepTime;
      const stepIncrement = end / stepCount;

      const timer = setInterval(() => {
        start += stepIncrement;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, stepTime);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const colorStyles = {
    blue: "border-[#4F7CFF]/40 text-[#4F7CFF] bg-blue-950/20",
    violet: "border-[#8B6CFF]/40 text-[#8B6CFF] bg-purple-950/20",
    teal: "border-[#21C7A8]/40 text-[#21C7A8] bg-teal-950/20",
    amber: "border-[#F5B84B]/40 text-[#F5B84B] bg-amber-950/20",
    green: "border-[#38C98A]/40 text-[#38C98A] bg-emerald-950/20",
  };

  return (
    <Card variant="surface" className="p-5 relative overflow-hidden group hover:border-slate-500 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {displayValue}
            </h3>
            {delta && (
              <span className={clsx(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                deltaType === 'positive' && "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
                deltaType === 'negative' && "bg-rose-950/60 text-rose-300 border border-rose-500/30",
                deltaType === 'neutral' && "bg-slate-800 text-slate-300"
              )}>
                {delta}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={clsx("p-2.5 rounded-xl border shrink-0", colorStyles[accentColor])}>
          {icon}
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3 pt-2.5 border-t border-[#22375F] text-xs font-medium text-[#4F7CFF] hover:text-cyan-300 transition-colors flex items-center justify-between group-hover:underline text-left w-full"
        >
          <span>{actionLabel}</span>
          <span>→</span>
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#4F7CFF]/40 to-transparent group-hover:via-[#4F7CFF] transition-all" />
    </Card>
  );
};
