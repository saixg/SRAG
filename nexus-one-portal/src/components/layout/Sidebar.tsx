import React from 'react';
import {
  LayoutDashboard,
  User,
  Megaphone,
  CalendarDays,
  Receipt,
  GraduationCap,
  Users,
  FolderKanban,
  CheckSquare,
  Calendar,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '../common/Tooltip';

export interface SidebarProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse
}) => {
  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" />, badge: 'New' },
        { id: 'attendance', label: 'Leave & Attendance', icon: <CalendarDays className="w-4 h-4" /> },
        { id: 'payroll', label: 'Payroll', icon: <Receipt className="w-4 h-4" /> },
        { id: 'benefits', label: 'Benefits & Wellness', icon: <HeartHandshake className="w-4 h-4" /> },
      ]
    },
    {
      title: 'GROWTH & TEAMS',
      items: [
        { id: 'learning', label: 'Learning & Dev', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'directory', label: 'Company Directory', icon: <Users className="w-4 h-4" /> },
        { id: 'team', label: 'Team Workspace', icon: <FolderKanban className="w-4 h-4" /> },
        { id: 'tasks', label: 'Tasks & Approvals', icon: <CheckSquare className="w-4 h-4" />, badge: '4' },
        { id: 'events', label: 'Events & Community', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    {
      title: 'SUPPORT',
      items: [
        { id: 'support', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/75 z-40 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside className={clsx(
        "fixed lg:static top-0 bottom-0 left-0 z-40 bg-[#0B1020] border-r border-[#22375F] flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 select-none",
        isOpenMobile ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Brand Header */}
        <div className={clsx("relative h-16 flex items-center border-b border-[#22375F] bg-[#111A2E]/50", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F7CFF] to-[#27D8E8] flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/30 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">Nexus One</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">Nexus Technologies</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className={clsx("hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]", isCollapsed ? "absolute right-1 top-1/2 -translate-y-1/2 w-6 h-8 bg-[#111A2E] border border-[#22375F] shadow-lg" : "p-1.5")}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-5 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const isActive = currentRoute === item.id;
                const buttonContent = (
                  <button
                    key={item.id}
                    onClick={() => {
                      onRouteChange(item.id);
                      onCloseMobile();
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group select-none text-left relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]",
                      isActive
                        ? "bg-gradient-to-r from-[#142347] to-[#111A2E] text-[#4F7CFF] border border-[#4F7CFF]/40 shadow-sm font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-[#15223D] border border-transparent",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#4F7CFF] rounded-r-full" />
                    )}

                    <div className={clsx(
                      "p-1 rounded-lg transition-colors",
                      isActive ? "text-[#4F7CFF] bg-[#142347]" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                      {item.icon}
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={clsx(
                            "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                            item.badge === 'New' ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30" : "bg-blue-950 text-blue-300 border border-blue-500/30"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id} content={item.label}>
                      {buttonContent}
                    </Tooltip>
                  );
                }

                return buttonContent;
              })}
            </div>
          ))}
        </div>

        {/* Bottom Portal Preview Info */}
        {!isCollapsed && (
          <div className="p-3 border-t border-[#22375F] bg-[#111A2E]/40">
            <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-mono text-slate-400">Portal Preview</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] font-semibold text-slate-200">
                Nexus One demo
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Sample data is active
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
