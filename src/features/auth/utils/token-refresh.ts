import { Mutex } from "async-mutex";

import { API_BASE_URL } from "@/constants/config";

import { useAuthStore } from "../store/auth-store";

const refreshMutex = new Mutex();

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

interface ApiResponse {
  data: TokenResponse;
}

/**
 * Mutex-protected token refresh.
 * Gets fresh token INSIDE mutex to prevent race conditions.
 * Updates store immediately after successful refresh.
 */
export const refreshTokensWithMutex = async (): Promise<TokenResponse> => {
  return refreshMutex.runExclusive(async () => {
    // Get FRESH token inside mutex (may have been updated by prior concurrent call)
    const { refreshToken, setTokens } = useAuthStore.getState();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const json = (await response.json()) as ApiResponse;
    const tokens = json.data;

    // Update store immediately inside mutex (before other waiters proceed)
    setTokens(tokens.access_token, tokens.refresh_token);

    return tokens;
  });
};
