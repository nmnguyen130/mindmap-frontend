import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authApi, AuthResponse } from "../services/auth-api";
import {
  useAuthStore,
  selectAccessToken,
  selectSetTokens,
  selectClearTokens,
} from "../store/auth-store";
import { getUserFromToken } from "../utils/jwt-utils";

// Query keys
export const authKeys = {
  all: ["auth"],
  me: () => [...authKeys.all, "me"],
} as const;

/**
 * Core auth hook: Manages login/logout, derives user from JWT.
 * Mutations invalidate queries on success (TanStack v5 pattern).
 * Memoized for stable references, minimal re-renders.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  // Zustand state
  const accessToken = useAuthStore(selectAccessToken);
  const setTokens = useAuthStore(selectSetTokens);
  const clearTokens = useAuthStore(selectClearTokens);

  // Derive user from token (memoized)
  const user = useMemo(
    () => (accessToken ? getUserFromToken(accessToken) : null),
    [accessToken]
  );

  const isAuthenticated = !!accessToken;

  // Login mutation
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: AuthResponse) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Register mutation
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: AuthResponse) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Forgot/Reset mutations (no onSuccess needed)
  const forgotPassword = useMutation({ mutationFn: authApi.forgotPassword });
  const resetPassword = useMutation({ mutationFn: authApi.resetPassword });

  // Social/OAuth mutations
  const socialLogin = useMutation({ mutationFn: authApi.socialLogin });
  const handleOAuthCallback = useMutation({
    mutationFn: authApi.handleOAuthCallback,
    onSuccess: (data: AuthResponse) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Logout: Stable callback, cleanup on server + local
  const logout = useCallback(async () => {
    await authApi.logout().catch((error) => {
      console.warn("[Auth] Logout API failed:", error);
    });

    clearTokens();
    queryClient.removeQueries({ queryKey: authKeys.all });
  }, [queryClient]);

  // Memoize full return object (stable for consumers)
  return useMemo(
    () => ({
      // State
      user,
      isAuthenticated,
      accessToken,

      // Mutations
      login,
      register,
      forgotPassword,
      resetPassword,
      socialLogin,
      handleOAuthCallback,

      // Actions
      logout,
    }),
    [
      user,
      isAuthenticated,
      accessToken,
      login,
      register,
      forgotPassword,
      resetPassword,
      socialLogin,
      handleOAuthCallback,
      logout,
    ]
  );
};
