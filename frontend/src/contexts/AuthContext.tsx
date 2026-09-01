import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api, { AUTH_TOKEN_STORAGE_KEY } from '../services/api';

export type UserRole = 'customer' | 'operations' | 'rider' | 'admin';

export const getRoleDashboard = (role?: UserRole): string => {
  switch (role) {
    case 'customer': return '/request-pickup';
    case 'operations': return '/ops-board';
    case 'admin': return '/admin';
    case 'rider': return '/rider-board';
    default: return '/';
  }
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (name: string, phone: string, password: string) => Promise<User>;
  requestPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<{ exists: boolean; user?: User }>;
  completePhoneSignup: (phone: string, code: string, name: string, role: UserRole) => Promise<User>;
  requestPhoneVerification: () => Promise<void>;
  confirmPhoneVerification: (code: string) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

/** Auth endpoints return { ...user, token? }. Persist the token as a cross-site cookie fallback. */
function persistAuthToken(data: User & { token?: string }) {
  if (!data.token) return;
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
  } catch {
    // localStorage unavailable — cookie-based auth still applies where it works.
  }
}

/**
 * AuthProvider Component
 * Wraps the entire app to provide authentication state globally.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get<User & { token?: string }>('/auth/me');
        persistAuthToken(data);
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.post<User>('/auth/login', { identifier, password });
      persistAuthToken(data);
      setUser(data);
      return data;
    } catch (err) {
      const message = extractErrorMessage(err, 'Login failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, phone: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.post<User>('/auth/register', { name, phone, password });
      persistAuthToken(data);
      setUser(data);
      return data;
    } catch (err) {
      const message = extractErrorMessage(err, 'Signup failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPhoneOtp = async (phone: string) => {
    setError(null);
    try {
      await api.post('/auth/phone/request-otp', { phone });
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to send code');
      setError(message);
      throw err;
    }
  };

  const verifyPhoneOtp = async (phone: string, code: string) => {
    setError(null);
    try {
      const { data } = await api.post<{ exists: boolean; user?: User }>('/auth/phone/verify-otp', { phone, code });
      if (data.exists && data.user) {
        persistAuthToken(data.user);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      const message = extractErrorMessage(err, 'Invalid or expired code');
      setError(message);
      throw err;
    }
  };

  const completePhoneSignup = async (phone: string, code: string, name: string, role: UserRole) => {
    setError(null);
    try {
      const { data } = await api.post<User>('/auth/phone/signup', { phone, code, name, role });
      persistAuthToken(data);
      setUser(data);
      return data;
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to complete signup');
      setError(message);
      throw err;
    }
  };

  const requestPhoneVerification = async () => {
    setError(null);
    try {
      await api.post('/auth/phone/verify/request');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to send verification code');
      setError(message);
      throw err;
    }
  };

  const confirmPhoneVerification = async (code: string) => {
    setError(null);
    try {
      const { data } = await api.post<User>('/auth/phone/verify/confirm', { code });
      setUser(data);
      return data;
    } catch (err) {
      const message = extractErrorMessage(err, 'Invalid or expired code');
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // localStorage unavailable — nothing to clear
    }
    api.post('/auth/logout').catch(() => {});
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    signup,
    requestPhoneOtp,
    verifyPhoneOtp,
    completePhoneSignup,
    requestPhoneVerification,
    confirmPhoneVerification,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
