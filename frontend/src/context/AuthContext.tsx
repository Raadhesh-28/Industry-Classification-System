'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiJson,
  clearByokKey,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  TokenResponse,
  UserProfile,
} from '@/lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    role?: 'recruiter' | 'hiring_manager'
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const existingToken = getStoredToken();
      if (!existingToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const profile = await apiJson<UserProfile>('/auth/me');
        if (active) {
          setToken(existingToken);
          setUser(profile);
        }
      } catch {
        if (active) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiJson<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      role: 'recruiter' | 'hiring_manager' = 'recruiter'
    ) => {
      const data = await apiJson<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      setStoredToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredToken();
    clearByokKey();
    setToken(null);
    setUser(null);
    router.push('/');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
