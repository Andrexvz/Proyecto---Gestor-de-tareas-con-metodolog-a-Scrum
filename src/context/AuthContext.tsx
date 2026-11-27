import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, setOnUnauthorized, setStoredToken } from '../lib/api';
import { useToast } from './ToastContext';
import type { User } from '../types/scrum';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = 'agile_velocity_user';

function safeGetCachedUser(): User | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
  } catch {}
  return null;
}

function safeSetCachedUser(user: User | null) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    }
  } catch {}
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children?: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(() => {
    if (initialUser) return initialUser;
    return safeGetCachedUser();
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const token = getStoredToken();
    if (!token) return false;
    return !safeGetCachedUser();
  });
  const { showToast } = useToast();

  useEffect(() => {
    setOnUnauthorized((message) => {
      safeSetCachedUser(null);
      setUser(null);
      if (message) showToast(message, 'warning');
    });
  }, [showToast]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<{ user: User }>('/api/v1/auth/me', { skipAuthRedirect: true })
      .then((res) => {
        setUser(res.user);
        safeSetCachedUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        safeSetCachedUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ token: string; user: User }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
      });
      setStoredToken(res.token);
      safeSetCachedUser(res.user);
      setUser(res.user);
      showToast('Bienvenido al sistema', 'success');
    },
    [showToast]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    safeSetCachedUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
