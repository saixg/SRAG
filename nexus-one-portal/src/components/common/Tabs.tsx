import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx("flex items-center gap-1.5 border-b border-[#22375F] pb-px overflow-x-auto custom-scrollbar", className)}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-xs lg:text-sm font-medium rounded-t-xl transition-all relative whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]",
              isActive
                ? "text-[#4F7CFF] bg-[#15223D] border-t border-x border-[#22375F] font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={clsx(
                "px-2 py-0.5 text-[10px] font-mono rounded-full",
                isActive ? "bg-blue-950 text-blue-300 border border-blue-500/40" : "bg-slate-800 text-slate-400"
              )}>
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F7CFF]" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-slate-200 bg-[#15223D] border border-[#22375F] rounded-lg shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          {content}
        </div>
      )}
    </div>
  );
};
