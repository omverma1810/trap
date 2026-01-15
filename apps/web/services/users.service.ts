/**
 * Users Service
 * Handles admin user management API calls
 */
import { apiClient } from "@/lib/api/client";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "ADMIN" | "STAFF";
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
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
  is_active?: boolean;
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
