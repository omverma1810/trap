/**
 * Centralized API Client
 * Uses environment-based configuration for production safety
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Create axios instance with defaults
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Request interceptor for auth token (future-ready)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from storage when auth is implemented
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle specific error codes
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 401:
          // Clear token and redirect to login when auth is implemented
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            // window.location.href = "/login";
          }
          break;
        case 403:
          console.error("Access forbidden");
          break;
        case 404:
          console.error("Resource not found");
          break;
        case 500:
          console.error("Server error");
          break;
      }
    } else if (error.request) {
      console.error("Network error - no response received");
    }
    
    return Promise.reject(error);
  }
);

// Type-safe API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Generic request helpers
export const api = {
  get: <T>(url: string, params?: Record<string, any>) =>
    apiClient.get<T>(url, { params }).then((res) => res.data),
    
  post: <T>(url: string, data?: any) =>
    apiClient.post<T>(url, data).then((res) => res.data),
    
  put: <T>(url: string, data?: any) =>
    apiClient.put<T>(url, data).then((res) => res.data),
    
  patch: <T>(url: string, data?: any) =>
    apiClient.patch<T>(url, data).then((res) => res.data),
    
  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((res) => res.data),
};

export default apiClient;
