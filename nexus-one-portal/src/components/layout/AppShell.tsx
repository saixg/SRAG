import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import { QuickScheduleModal } from './QuickScheduleModal';
import { AssistantWidget } from './AssistantWidget';

export interface AppShellProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  children
}) => {
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('nexus_one_preferences_v1') || '{}');
      document.documentElement.dataset.theme = prefs.theme || 'dark';
    } catch { /* Keep the default workspace theme. */ }
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-[#0B1020] text-[#F8FAFC] flex flex-col font-sans">
      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onRouteChange={onRouteChange}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
          <TopBar
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenSchedule={() => setIsScheduleOpen(true)}
            currentRoute={currentRoute}
            onRouteChange={onRouteChange}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12 animate-in fade-in duration-200">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentRoute={currentRoute}
        onRouteChange={onRouteChange}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Global Modals & Drawers */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onRouteChange}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={onRouteChange}
      />

      <QuickScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
      <AssistantWidget />
    </div>
  );
};
