import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  Menu,
  Receipt,
  HelpCircle,
  Megaphone,
  User
} from 'lucide-react';
import { clsx } from 'clsx';

export interface BottomNavProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentRoute,
  onRouteChange,
  onOpenMoreMenu
}) => {
  const mainTabs = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="w-5 h-5" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1020]/95 border-t border-[#22375F] backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-2xl select-none">
      {mainTabs.map(tab => {
        const isActive = currentRoute === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onRouteChange(tab.id)}
            className={clsx(
              "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all flex-1 text-center",
              isActive
                ? "text-[#4F7CFF] font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <div className={clsx(
              "p-1 rounded-lg transition-transform",
              isActive && "scale-110"
            )}>
              {tab.icon}
            </div>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}

      {/* More Button */}
      <button
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white transition-all flex-1 text-center"
      >
        <div className="p-1 rounded-lg">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
