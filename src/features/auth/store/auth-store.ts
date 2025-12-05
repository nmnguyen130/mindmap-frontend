import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { secureStorage } from "../utils/secure-storage";

export interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

/**
 * Global auth store with Zustand + secure persistence.
 * Only tokens are persisted; user data is refetched on app start.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        _hasHydrated: false,

        // Set full auth state after login/register
        setAuth: (user, accessToken, refreshToken) =>
          set((state) => {
            state.user = user;
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
          }),

        // Update only tokens (e.g., after refresh)
        setTokens: (accessToken, refreshToken) =>
          set((state) => {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
          }),

        // Clear all auth data on logout
        logout: () =>
          set((state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
          }),

        // Mark store as hydrated after loading persisted tokens
        setHasHydrated: (value) =>
          set((state) => {
            state._hasHydrated = value;
          }),
      })),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => secureStorage),
        // Persist only tokens (user refetched via Query for freshness).
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
        onRehydrateStorage: () => (state) => {
          // Mark hydrated after loading persisted tokens.
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: "AuthStore" }
  )
);

// Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated;
export const selectAccessToken = (state: AuthState) => state.accessToken;
export const selectRefreshToken = (state: AuthState) => state.refreshToken;
export const selectHasHydrated = (state: AuthState) => state._hasHydrated;
