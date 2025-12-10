/**
 * Theme Context
 * Manages app theme (light/dark mode)
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Theme colors
export const colors = {
  dark: {
    background: '#1a1a2e',
    surface: '#16213e',
    surfaceLight: '#1f2b47',
    primary: '#00d9ff',
    primaryDark: '#0099b3',
    secondary: '#e94560',
    text: '#ffffff',
    textSecondary: '#8b9dc3',
    textMuted: '#5a6a8a',
    success: '#00e676',
    warning: '#ffab00',
    error: '#ff5252',
    border: '#2d3a5a',
    card: '#1f2b47',
    // Spam category colors
    spam: '#e94560',
    safe: '#00e676',
    betting: '#ff6b35',
    phishing: '#ff4444',
    scam: '#ff1744',
    promotional: '#ffc107',
  },
  light: {
    background: '#f5f7fa',
    surface: '#ffffff',
    surfaceLight: '#f0f2f5',
    primary: '#0088cc',
    primaryDark: '#006699',
    secondary: '#e94560',
    text: '#1a1a2e',
    textSecondary: '#5a6a8a',
    textMuted: '#8b9dc3',
    success: '#00c853',
    warning: '#ff9800',
    error: '#f44336',
    border: '#e0e0e0',
    card: '#ffffff',
    spam: '#e94560',
    safe: '#00c853',
    betting: '#ff6b35',
    phishing: '#ff4444',
    scam: '#ff1744',
    promotional: '#ffc107',
  },
};

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  colors: typeof colors.dark;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemTheme || 'dark');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value: ThemeContextType = {
    theme,
    colors: colors[theme],
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
