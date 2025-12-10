/**
 * Authentication Context
 * Manages user authentication state throughout the app
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthAPI, UserAPI, TokenManager, User, AuthResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    language?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const token = await TokenManager.getAccessToken();
      if (token) {
        const userData = await UserAPI.getProfile();
        setUser(userData);
      }
    } catch (error) {
      // Token expired or invalid
      await TokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await AuthAPI.login(email, password);
    await TokenManager.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }

  async function register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    language?: string;
  }) {
    const response = await AuthAPI.register(data);
    await TokenManager.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }

  async function logout() {
    try {
      await AuthAPI.logout();
    } catch (error) {
      // Ignore errors, just clear local state
    }
    await TokenManager.clearTokens();
    setUser(null);
  }

  function updateUser(userData: User) {
    setUser(userData);
  }

  async function refreshUser() {
    try {
      const userData = await UserAPI.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
