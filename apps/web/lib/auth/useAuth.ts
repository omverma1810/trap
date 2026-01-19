/**
 * useAuth Hook - Convenience hook for auth state and actions.
 */

import { useEffect } from "react";
import { useAuthStore } from "./auth.store";

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, checkAuth } =
    useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const role = user?.role ?? null;

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    role,
    isAdmin: role === "ADMIN",
    isStaff: role === "STAFF",
    // Alias for dashboard access (Admin can see all dashboards)
    canViewReports: role === "ADMIN",

    // Actions
    login,
    logout,
    checkAuth,
  };
}

export default useAuth;
