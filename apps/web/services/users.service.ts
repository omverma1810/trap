/**
 * Users Service
 * Handles admin user management API calls
 */
import { apiClient } from "@/lib/api/client";

// Backend returns camelCase due to CamelCaseJSONRenderer
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  dateJoined: string;
  lastLogin: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name?: string;
  role: "ADMIN" | "STAFF";
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  role?: "ADMIN" | "STAFF";
  is_active?: boolean; // Backend accepts snake_case for writes
  password?: string;
}

export interface UpdateProfilePayload {
  email?: string;
  name?: string;
  current_password?: string;
  new_password?: string;
}

export const usersService = {
  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>("/admin/users/");
    return response.data;
  },

  /**
   * Get a single user by ID (admin only)
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/admin/users/${id}/`);
    return response.data;
  },

  /**
   * Create a new user (admin only)
   */
  async createUser(data: CreateUserPayload): Promise<User> {
    const response = await apiClient.post<User>("/admin/users/", data);
    return response.data;
  },

  /**
   * Update a user (admin only)
   */
  async updateUser(id: number, data: UpdateUserPayload): Promise<User> {
    const response = await apiClient.patch<User>(`/admin/users/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a user (admin only)
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}/`);
  },

  /**
   * Update current user's profile
   */
  async updateProfile(data: UpdateProfilePayload): Promise<User> {
    const response = await apiClient.patch<User>("/auth/me/", data);
    return response.data;
  },

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me/");
    return response.data;
  },
};
