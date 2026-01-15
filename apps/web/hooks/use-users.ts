/**
 * Users Hook
 * React Query hooks for user management
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usersService,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateProfilePayload,
} from "@/services/users.service";
import { toast } from "sonner";

const USERS_KEY = ["users"];
const PROFILE_KEY = ["profile"];

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => usersService.getUsers(),
    staleTime: 30000,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: () => usersService.getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserPayload) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.email?.[0] ||
        error.response?.data?.error?.message ||
        "Failed to create user";
      toast.error(message);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) =>
      usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error?.message || "Failed to update user";
      toast.error(message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error?.message || "Failed to delete user";
      toast.error(message);
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => usersService.getProfile(),
    staleTime: 60000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfilePayload) =>
      usersService.updateProfile(data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      // Also update auth state if needed
      toast.success("Profile updated successfully");
      return user;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.current_password?.[0] ||
        error.response?.data?.email?.[0] ||
        error.response?.data?.error?.message ||
        "Failed to update profile";
      toast.error(message);
    },
  });
}
