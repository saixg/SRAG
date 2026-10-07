import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Announcements } from './pages/Announcements';
import { Attendance } from './pages/Attendance';
import { Payroll } from './pages/Payroll';
import { Benefits } from './pages/Benefits';
import { Learning } from './pages/Learning';
import { Directory } from './pages/Directory';
import { TeamWorkspace } from './pages/TeamWorkspace';
import { TasksApprovals } from './pages/TasksApprovals';
import { Events } from './pages/Events';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';

const routeNames = ['dashboard', 'profile', 'announcements', 'attendance', 'payroll', 'benefits', 'learning', 'directory', 'team', 'tasks', 'events', 'support', 'settings'];
const normalizeRoute = (path: string) => {
  const clean = path.replace(/^#?\/?/, '').split(/[?#]/)[0];
  if (!clean || clean === 'login') return clean || 'dashboard';
  return routeNames.includes(clean) ? clean : 'dashboard';
};
const routeFromLocation = () => normalizeRoute(window.location.pathname === '/' ? window.location.hash : window.location.pathname);

const RouterContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState(routeFromLocation);
  const activeRoute = !isAuthenticated ? 'login' : currentRoute === 'login' ? 'dashboard' : currentRoute;

  useEffect(() => {
    const update = () => setCurrentRoute(routeFromLocation());
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && window.location.pathname !== `/${activeRoute}`) {
      window.history.replaceState({}, '', `/${activeRoute}`);
    }
  }, [activeRoute, isLoading]);

  const navigate = useCallback((path: string) => {
    const route = normalizeRoute(path);
    window.history.pushState({}, '', `/${route}`);
    setCurrentRoute(route);
  }, []);
  const finishLogin = useCallback(() => navigate('dashboard'), [navigate]);
  if (isLoading) return <div className="app-loading" role="status" aria-label="Loading Nexus One"><span /></div>;
  if (!isAuthenticated) return <Login onLoginSuccess={finishLogin} />;

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={navigate} />,
    profile: <Profile />,
    announcements: <Announcements />,
    attendance: <Attendance />,
    payroll: <Payroll />,
    benefits: <Benefits />,
    learning: <Learning />,
    directory: <Directory />,
    team: <TeamWorkspace />,
    tasks: <TasksApprovals />,
    events: <Events />,
    support: <Support />,
    settings: <Settings />,
  };

  return <AppShell currentRoute={activeRoute} onRouteChange={navigate}>{pages[activeRoute] ?? pages.dashboard}</AppShell>;
};

export function App() {
  return <AuthProvider><ToastProvider><RouterContent /></ToastProvider></AuthProvider>;
}

export default App;
