import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import { secureStorage } from "../utils/secure-storage";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;

  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

/**
 * Minimal Zustand store for auth tokens only.
 * Persists to SecureStore (encrypted).
 * User derived from JWT elsewhere (no duplicate state).
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,

        setTokens: (accessToken, refreshToken) =>
          set({ accessToken, refreshToken }),

        clearTokens: () => set({ accessToken: null, refreshToken: null }),
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => secureStorage),
      }
    ),
    { name: "AuthStore" }
  )
);

// Stable selectors: Prevent re-renders on unrelated state changes
export const selectAccessToken = (state: AuthState) => state.accessToken;
export const selectRefreshToken = (state: AuthState) => state.refreshToken;
export const selectSetTokens = (state: AuthState) => state.setTokens;
export const selectClearTokens = (state: AuthState) => state.clearTokens;
