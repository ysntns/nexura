/**
 * Nexura-cAIL API Service
 * Handles all communication with the backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// API Configuration - MUST be set via environment variable
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 
                     Constants.expoConfig?.extra?.backendUrl;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL environment variable is not set. Please configure it in .env file.');
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'nexura_access_token';
const REFRESH_TOKEN_KEY = 'nexura_refresh_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
export const TokenManager = {
  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          await TokenManager.setTokens(access_token, refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens
        await TokenManager.clearTokens();
      }
    }

    return Promise.reject(error);
  }
);

// API Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  language: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  total_messages_analyzed: number;
  total_spam_blocked: number;
}

export interface SpamAnalysis {
  is_spam: boolean;
  confidence: number;
  category: string;
  risk_level: string;
  explanation: string;
  detected_patterns: string[];
  recommended_action: string;
}

export interface Message {
  id: string;
  content: string;
  sender?: string;
  sender_phone?: string;
  source: string;
  analysis: SpamAnalysis;
  is_blocked: boolean;
  created_at: string;
  user_feedback?: string;
}

export interface MessageStats {
  total_analyzed: number;
  total_spam: number;
  total_safe: number;
  spam_by_category: Record<string, number>;
  blocked_count: number;
  accuracy_feedback: Record<string, number>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// API Functions
export const AuthAPI = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    language?: string;
  }): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    await TokenManager.clearTokens();
  },
};

export const MessageAPI = {
  async analyze(data: {
    content: string;
    sender?: string;
    sender_phone?: string;
    source?: string;
  }): Promise<Message> {
    const response = await api.post('/messages/analyze', {
      ...data,
      source: data.source || 'manual',
    });
    return response.data;
  },

  async analyzeBulk(messages: Array<{
    content: string;
    sender?: string;
    sender_phone?: string;
    source?: string;
  }>): Promise<{
    total: number;
    spam_count: number;
    safe_count: number;
    results: Message[];
  }> {
    const response = await api.post('/messages/analyze/bulk', { messages });
    return response.data;
  },

  async getHistory(params?: {
    skip?: number;
    limit?: number;
    spam_only?: boolean;
  }): Promise<Message[]> {
    const response = await api.get('/messages', { params });
    return response.data;
  },

  async getStats(): Promise<MessageStats> {
    const response = await api.get('/messages/stats');
    return response.data;
  },

  async provideFeedback(messageId: string, feedback: 'correct' | 'incorrect' | 'unsure'): Promise<void> {
    await api.patch(`/messages/${messageId}/feedback`, { feedback });
  },

  async delete(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },
};

export const UserAPI = {
  async getProfile(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(data: {
    full_name?: string;
    phone?: string;
    language?: string;
  }): Promise<User> {
    const response = await api.patch('/users/me', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getSettings(): Promise<any> {
    const response = await api.get('/users/me/settings');
    return response.data;
  },

  async updateSettings(data: {
    auto_block_spam?: boolean;
    auto_block_threshold?: number;
    notifications_enabled?: boolean;
    language?: string;
    block_categories?: string[];
  }): Promise<any> {
    const response = await api.patch('/users/me/settings', data);
    return response.data;
  },

  async addToWhitelist(value: string, type: string, note?: string): Promise<void> {
    await api.post('/users/me/whitelist', { value, type, note });
  },

  async removeFromWhitelist(value: string): Promise<void> {
    await api.delete(`/users/me/whitelist/${encodeURIComponent(value)}`);
  },

  async addToBlacklist(value: string, type: string, reason?: string): Promise<void> {
    await api.post('/users/me/blacklist', { value, type, reason });
  },

  async removeFromBlacklist(value: string): Promise<void> {
    await api.delete(`/users/me/blacklist/${encodeURIComponent(value)}`);
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/users/me');
    await TokenManager.clearTokens();
  },
};

// Caller ID & Phone Lookup API
export interface CallerInfo {
  phone_number: string;
  name?: string;
  email?: string;
  addresses?: Array<{
    city?: string;
    countryCode?: string;
    timeZone?: string;
    type?: string;
  }>;
  is_spam: boolean;
  spam_score?: number;
  carrier?: string;
  country?: string;
  community_reports?: number; // Number of community spam reports
}

export const CallerAPI = {
  async lookupNumber(
    phoneNumber: string,
    countryCode: string = 'TR'
  ): Promise<CallerInfo> {
    const response = await api.post('/caller/lookup', {
      phone_number: phoneNumber,
      country_code: countryCode,
    });
    return response.data;
  },

  async bulkLookup(
    phoneNumbers: string[],
    countryCode: string = 'TR'
  ): Promise<CallerInfo[]> {
    const response = await api.post('/caller/lookup/bulk', {
      phone_numbers: phoneNumbers,
      country_code: countryCode,
    });
    return response.data;
  },

  async reportSpam(
    phoneNumber: string,
    category: string,
    reason?: string,
    callerName?: string
  ): Promise<void> {
    await api.post('/caller/report-spam', {
      phone_number: phoneNumber,
      category: category,
      reason: reason,
      caller_name: callerName,
    });
  },

  async getTopSpamNumbers(
    limit: number = 100,
    minReports: number = 3
  ): Promise<any[]> {
    const response = await api.get('/caller/top-spam', {
      params: {
        limit: limit,
        min_reports: minReports,
      },
    });
    return response.data;
  },

  async getMyStats(): Promise<any> {
    const response = await api.get('/caller/my-stats');
    return response.data;
  },
};

export default api;
