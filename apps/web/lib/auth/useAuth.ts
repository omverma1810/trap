/**
 * useAuth Hook - Convenience hook for auth state and actions.
 */

import { useEffect } from 'react';
import { useAuthStore } from './auth.store';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    role: user?.role ?? null,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    
    // Actions
    login,
    logout,
    checkAuth,
  };
}

export default useAuth;
