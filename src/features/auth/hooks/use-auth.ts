import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi, AuthResponse } from "../services/auth-api";
import {
  selectAccessToken,
  selectHasHydrated,
  selectIsAuthenticated,
  selectRefreshToken,
  selectUser,
  useAuthStore,
} from "../store/auth-store";
import { clearTokens, saveTokens } from "../utils/secure-storage";

// Stable query keys for caching
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/** 
 * Main auth hook:
 * - Zustand for tokens + auth state
 * - React Query for server user state
 * - Auto-refetch user on focus/reconnect (global config)
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  // Zustand selectors
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const hasHydrated = useAuthStore(selectHasHydrated);
  const accessToken = useAuthStore(selectAccessToken);
  const refreshToken = useAuthStore(selectRefreshToken);

  const setAuth = useAuthStore((s) => s.setAuth);
  const setTokens = useAuthStore((s) => s.setTokens);
  const logoutStore = useAuthStore((s) => s.logout);

  // Background user query, enabled only after hydration + token
  const userQuery = useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.getMe({ accessToken: accessToken! }),
    enabled: !!accessToken && hasHydrated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  // Login mutation
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data: AuthResponse) => {
      await saveTokens(data.access_token, data.refresh_token);
      setAuth(data.user, data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Register mutation
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data: AuthResponse) => {
      await saveTokens(data.access_token, data.refresh_token);
      setAuth(data.user, data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Forgot password mutation
  const forgotPassword = useMutation({
    mutationFn: authApi.forgotPassword,
  });

  // Reset password mutation
  const resetPassword = useMutation({
    mutationFn: authApi.resetPassword,
  });

  // Social login mutation (returns OAuth URL)
  const socialLogin = useMutation({
    mutationFn: authApi.socialLogin,
  });

  // OAuth callback mutation (processes tokens + fetches user)
  const handleOAuthCallback = useMutation({
    mutationFn: authApi.handleOAuthCallback,
    onSuccess: async (data: AuthResponse) => {
      await saveTokens(data.access_token, data.refresh_token);
      setAuth(data.user, data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  // Logout: API call + local cleanup
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("[useAuth] Server logout failed:", error); // Ignore server errors
    } finally {
      await clearTokens();
      logoutStore();
      queryClient.removeQueries({ queryKey: authKeys.all });
    }
  };

  return {
    // State.
    user: user ?? userQuery.data, // Fallback to query data (no duplication).
    isAuthenticated,
    hasHydrated,
    isLoading: !hasHydrated || userQuery.isPending,
    accessToken,

    // Mutations.
    login,
    register,
    forgotPassword,
    resetPassword,
    socialLogin,
    handleOAuthCallback,

    // Actions.
    logout,
  };
};
