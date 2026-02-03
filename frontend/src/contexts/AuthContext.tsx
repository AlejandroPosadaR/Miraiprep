import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AuthResponse, SESSION_EXPIRED_EVENT } from '@/services/api';

export interface User {
  userId?: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    // Navigate to login - the message is stored in sessionStorage
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored && api.isAuthenticated()) {
      setUser({
        userId: stored.userId,
        email: stored.email,
        username: stored.username,
        firstName: stored.firstName,
        lastName: stored.lastName,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Listen for session expired events from API service
    const handleEvent = () => handleSessionExpired();
    window.addEventListener(SESSION_EXPIRED_EVENT, handleEvent);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleEvent);
  }, [handleSessionExpired]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser({
      userId: res.userId as string,
      email: res.email,
      username: res.username,
      firstName: res.firstName,
      lastName: res.lastName,
    });
    return res;
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const res = await api.register(data);
    setUser({
      userId: res.userId as string,
      email: res.email,
      username: res.username,
      firstName: res.firstName,
      lastName: res.lastName,
    });
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
