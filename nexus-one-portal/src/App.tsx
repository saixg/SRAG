import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Announcements = lazy(() => import('./pages/Announcements').then(module => ({ default: module.Announcements })));
const Attendance = lazy(() => import('./pages/Attendance').then(module => ({ default: module.Attendance })));
const Payroll = lazy(() => import('./pages/Payroll').then(module => ({ default: module.Payroll })));
const Benefits = lazy(() => import('./pages/Benefits').then(module => ({ default: module.Benefits })));
const Learning = lazy(() => import('./pages/Learning').then(module => ({ default: module.Learning })));
const Directory = lazy(() => import('./pages/Directory').then(module => ({ default: module.Directory })));
const TeamWorkspace = lazy(() => import('./pages/TeamWorkspace').then(module => ({ default: module.TeamWorkspace })));
const TasksApprovals = lazy(() => import('./pages/TasksApprovals').then(module => ({ default: module.TasksApprovals })));
const Events = lazy(() => import('./pages/Events').then(module => ({ default: module.Events })));
const Support = lazy(() => import('./pages/Support').then(module => ({ default: module.Support })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const PublicSite = lazy(() => import('./pages/PublicSite').then(module => ({ default: module.PublicSite })));

const publicRoutes = ['home', 'solutions', 'resources', 'customers', 'pricing', 'trust', 'accessibility', 'company', 'support', 'contact'];
const routeNames = [...publicRoutes, 'dashboard', 'profile', 'announcements', 'attendance', 'payroll', 'benefits', 'learning', 'directory', 'team', 'tasks', 'events', 'settings'];
const routePath = (route: string) => route === 'home' ? '/' : `/${route}`;
const normalizeRoute = (path: string) => {
  const clean = path.replace(/^#?\/?/, '').split(/[?#]/)[0];
  if (!clean) return 'home';
  if (clean === 'login') return 'login';
  return routeNames.includes(clean) ? clean : 'dashboard';
};
const routeFromLocation = () => normalizeRoute(window.location.pathname === '/' && /^#\//.test(window.location.hash) ? window.location.hash : window.location.pathname);

const RouterContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState(routeFromLocation);
  const activeRoute = isAuthenticated
    ? currentRoute === 'login' ? 'dashboard' : currentRoute
    : publicRoutes.includes(currentRoute) ? currentRoute : 'login';

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
    if (!isLoading && window.location.pathname !== routePath(activeRoute)) {
      window.history.replaceState({}, '', routePath(activeRoute));
    }
  }, [activeRoute, isLoading]);

  useEffect(() => {
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    const isPublicPage = publicRoutes.includes(activeRoute) && (!isAuthenticated || activeRoute !== 'support');
    robots.content = isPublicPage ? 'index,follow' : 'noindex,nofollow';
    if (!isPublicPage) document.title = activeRoute === 'login' ? 'Employee sign in | Nexus One' : 'Employee workspace | Nexus One';
  }, [activeRoute, isAuthenticated]);

  const navigate = useCallback((path: string) => {
    const route = normalizeRoute(path);
    window.history.pushState({}, '', routePath(route));
    setCurrentRoute(route);
  }, []);
  const finishLogin = useCallback(() => navigate('dashboard'), [navigate]);
  if (isLoading) return <div className="app-loading" role="status" aria-label="Loading Nexus One"><span /></div>;
  if (!isAuthenticated && activeRoute === 'login') return <Suspense fallback={<div className="app-loading" role="status" aria-label="Loading Nexus One"><span /></div>}><Login onLoginSuccess={finishLogin} /></Suspense>;
  if (publicRoutes.includes(activeRoute) && (!isAuthenticated || activeRoute !== 'support')) return <Suspense fallback={<div className="public-site-loading" role="status">Loading Nexus One…</div>}><PublicSite currentRoute={activeRoute} onNavigate={navigate} /></Suspense>;

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
    events: <Events onNavigate={navigate} />,
    support: <Support />,
    settings: <Settings />,
  };

  return <AppShell currentRoute={activeRoute} onRouteChange={navigate}><Suspense fallback={<div className="app-loading" role="status" aria-label="Loading workspace section"><span /></div>}>{pages[activeRoute] ?? pages.dashboard}</Suspense></AppShell>;
};

export function App() {
  return <AuthProvider><ToastProvider><RouterContent /></ToastProvider></AuthProvider>;
}

export default App;
