/**
 * Auth Service - API calls for authentication.
 */

import { api } from '@/lib/api';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'STAFF';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
}

const TOKEN_KEY = 'trap_access_token';
const REFRESH_KEY = 'trap_refresh_token';

export const authService = {
  /**
   * Login with email and password.
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/', credentials);
    
    // Store tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, response.access);
      localStorage.setItem(REFRESH_KEY, response.refresh);
    }
    
    return response;
  },

  /**
   * Logout - blacklist refresh token.
   */
  logout: async (): Promise<void> => {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // Ignore errors on logout
    } finally {
      // Clear tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
  },

  /**
   * Refresh access token.
   */
  refresh: async (): Promise<RefreshResponse> => {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    
    if (!refresh) {
      throw new Error('No refresh token');
    }
    
    const response = await api.post<RefreshResponse>('/auth/refresh/', { refresh });
    
    // Store new access token
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, response.access);
    }
    
    return response;
  },

  /**
   * Get current user.
   */
  me: async (): Promise<User> => {
    return api.get<User>('/auth/me/');
  },

  /**
   * Get stored access token.
   */
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Check if user has a stored token.
   */
  hasToken: (): boolean => {
    return !!authService.getAccessToken();
  },

  /**
   * Clear all tokens.
   */
  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  },
};

export default authService;
