import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { authApi } from '../services/auth-api';
import { selectAccessToken, selectHasHydrated, selectRefreshToken, useAuthStore } from '../store/auth-store';
import { clearTokens, saveTokens } from '../utils/secure-storage';

/**
 * Handles auth initialization:
 * - Zustand hydration
 * - Token validation & auto refresh
 * Runs ONCE on mount; React Query handles global refetches
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const accessToken = useAuthStore(selectAccessToken);
  const refreshToken = useAuthStore(selectRefreshToken);
  const hasHydrated = useAuthStore(selectHasHydrated);

  const setAuth = useAuthStore((s) => s.setAuth);
  const setTokens = useAuthStore((s) => s.setTokens);
  const logoutStore = useAuthStore((s) => s.logout);

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    const initializeAuth = async () => {
      // No tokens: skip to login screen.
      if (!accessToken || !refreshToken) {
        setIsInitializing(false);
        return;
      }

      try {
        // Validate with current access token.
        const user = await authApi.getMe({ accessToken });
        setAuth(user, accessToken, refreshToken);
      } catch {
        // Access expired: attempt refresh.
        try {
          const { access_token, refresh_token } = await authApi.refreshTokens({ refreshToken });
          await saveTokens(access_token, refresh_token);
          setTokens(access_token, refresh_token);

          // Fetch user with new tokens.
          const user = await authApi.getMe({ accessToken: access_token });
          setAuth(user, access_token, refresh_token);
        } catch {
          // Refresh failed: invalid session, force logout.
          console.warn('[AuthProvider] Session invalid, logging out');
          await clearTokens();
          logoutStore();
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [hasHydrated]);

  // Loading screen during hydration/init (Expo splash fallback).
  if (!hasHydrated || isInitializing) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-400 text-sm">Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
};