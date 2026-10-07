import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (username: string, password: string) => Promise<User>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_LOGIN_ENDPOINT = import.meta.env.VITE_AUTH_LOGIN_ENDPOINT as string | undefined;
const AUTH_SESSION_ENDPOINT = import.meta.env.VITE_AUTH_SESSION_ENDPOINT as string | undefined;
const AUTH_LOGOUT_ENDPOINT = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT as string | undefined;
const VALID_ROLES: UserRole[] = ['EMPLOYEE', 'MANAGER', 'PEOPLE_OPS', 'ADMINISTRATOR'];

const parseUser = (payload: unknown): User | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = 'user' in payload ? (payload as { user?: unknown }).user : payload;
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Partial<User>;
  if (!value.id || !value.name || !value.email || !value.role || !VALID_ROLES.includes(value.role)) return null;
  return {
    id: value.id, name: value.name, email: value.email, role: value.role,
    roleTitle: value.roleTitle || '', department: value.department || '', location: value.location || '',
    employeeId: value.employeeId || value.id, manager: value.manager || '', joinedDate: value.joinedDate || '',
    avatarUrl: value.avatarUrl, phone: value.phone, workArrangement: value.workArrangement,
    timeZone: value.timeZone, bio: value.bio, skills: value.skills || [],
    certifications: value.certifications || [], careerInterests: value.careerInterests || [], status: value.status || 'ONLINE',
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(AUTH_SESSION_ENDPOINT));

  useEffect(() => {
    if (!AUTH_SESSION_ENDPOINT) return;
    let cancelled = false;
    fetch(AUTH_SESSION_ENDPOINT, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(async response => {
        if (response.status === 401 || response.status === 403) return null;
        if (!response.ok) throw new Error('Could not check the company sign-in session.');
        return parseUser(await response.json());
      })
      .then(sessionUser => { if (!cancelled) setUser(sessionUser); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loginWithPassword = useCallback(async (username: string, password: string): Promise<User> => {
    if (!AUTH_LOGIN_ENDPOINT) throw new Error('Employee sign-in is not configured. Contact your workplace administrator.');
    const response = await fetch(AUTH_LOGIN_ENDPOINT, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.detail || body?.message || 'Your company account could not be verified.');
    const signedInUser = parseUser(body);
    if (!signedInUser) throw new Error('The sign-in service returned an incomplete employee profile.');
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (AUTH_LOGOUT_ENDPOINT) void fetch(AUTH_LOGOUT_ENDPOINT, { method: 'POST', credentials: 'include' }).catch(() => undefined);
  }, []);

  const updateUserProfile = (updates: Partial<User>) => setUser(current => current ? { ...current, ...updates } : current);

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginWithPassword, logout, updateUserProfile }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
