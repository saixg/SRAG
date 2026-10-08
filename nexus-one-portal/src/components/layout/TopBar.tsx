import React, { useState } from 'react';
import { Menu, Search, Bell, Calendar, ChevronDown, User as UserIcon, Settings, LogOut, Command } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export interface TopBarProps {
  onToggleMobileMenu: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenSchedule: () => void;
  currentRoute: string;
  onRouteChange: (route: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileMenu,
  onOpenSearch,
  onOpenNotifications,
  onOpenSchedule,
  currentRoute,
  onRouteChange
}) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const routeTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Employee Dashboard', subtitle: 'Welcome to your daily workspace overview' },
    profile: { title: 'My Employee Profile', subtitle: 'Manage your professional details, skills, and preferences' },
    announcements: { title: 'Company Announcements', subtitle: 'Stay informed with what matters across Nexus' },
    attendance: { title: 'Leave & Attendance', subtitle: 'Track attendance, apply for leave, and view holidays' },
    payroll: { title: 'Payroll Overview', subtitle: 'Safe synthetic compensation and payslip breakdowns' },
    benefits: { title: 'Benefits & Wellness', subtitle: 'Comprehensive health, wellness, and retirement plans' },
    learning: { title: 'Learning & Development', subtitle: 'Expand your skills with curated Nexus learning paths' },
    directory: { title: 'Company Directory', subtitle: 'Connect with colleagues across departments and locations' },
    team: { title: 'Team Workspace', subtitle: 'Product Experience objectives, sprint goals, and updates' },
    tasks: { title: 'Tasks & Approvals', subtitle: 'Manage your action items and pending team approvals' },
    events: { title: 'Events & Community', subtitle: 'Discover upcoming workshops, town halls, and wellness sessions' },
    support: { title: 'Help & Support Center', subtitle: 'Find answers or submit requests to workplace teams' },
    settings: { title: 'Workspace Settings', subtitle: 'Configure notifications, appearance, and preferences' },
  };

  const currentInfo = routeTitles[currentRoute] || { title: 'Nexus One', subtitle: 'Nexus Technologies' };

  return (
    <header className="h-16 bg-[#0B1020]/90 border-b border-[#22375F] px-4 lg:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu & Current Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm lg:text-base font-bold text-white tracking-tight flex items-center gap-2">
            {currentInfo.title}
          </h1>
          <p className="text-[11px] text-slate-400 truncate hidden md:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#15223D]/80 hover:bg-[#15223D] border border-[#22375F] hover:border-[#4F7CFF]/50 text-xs text-slate-400 transition-all shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search announcements, colleagues, tasks, courses...</span>
          </span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Action Icons & Profile Dropdown */}
      <div className="flex items-center gap-2 lg:gap-3">
        <button onClick={onOpenSearch} aria-label="Search" className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100" title="Search">
          <Search className="w-4 h-4" />
        </button>
        {/* Calendar Quick Action */}
        <button
          onClick={onOpenSchedule}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#15223D] border border-transparent hover:border-[#22375F] transition-all"
          title="Schedule meeting with colleague"
        >
          <Calendar className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#15223D] border border-transparent hover:border-[#22375F] relative transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4F7CFF] ring-2 ring-[#0B1020]" />
        </button>

        {/* Profile Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-[#15223D] hover:bg-[#1C2D4F] border border-[#22375F] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#4F7CFF] to-[#8B6CFF] flex items-center justify-center text-white font-bold text-xs shadow shrink-0">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user.department}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-[#111A2E] border border-[#22375F] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                {/* User Info Card */}
                <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <StatusBadge type={user.role} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">{user.roleTitle}</p>
                  <p className="text-[11px] text-slate-400 break-all mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-[#27D8E8] mt-1">ID: {user.employeeId}{user.location ? ` | ${user.location}` : ''}</p>
                </div>
                {/* Account actions */}
                <div className="space-y-1 pt-2 border-t border-[#22375F]">
                  <button
                    onClick={() => {
                      onRouteChange('profile');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#15223D] transition-colors text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onRouteChange('settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#15223D] transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#8B6CFF]" />
                    <span>Workspace Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
