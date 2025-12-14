import { API_BASE_URL } from "@/constants/config";
import { ApiResult } from "@/lib/fetch-client";

import { useAuthStore } from "../store/auth-store";

import { refreshTokensWithMutex } from "./token-refresh";

interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Authenticated fetch with automatic 401 refresh + retry.
 * Use this for all authenticated API calls.
 */
export async function fetchWithAuth<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  const { accessToken, clearTokens } = useAuthStore.getState();

  if (!accessToken) {
    return { data: null, error: "No access token", status: 401 };
  }

  const doFetch = async (token: string): Promise<ApiResult<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
      });

      const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;

      if (!response.ok) {
        return {
          data: null,
          error: json.message ?? "Request failed",
          status: response.status,
        };
      }

      return { data: json.data, error: null, status: response.status };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Network error",
        status: 0,
      };
    }
  };

  // First attempt
  let result = await doFetch(accessToken);

  // On 401, try refresh + retry once
  if (result.status === 401) {
    try {
      // refreshTokensWithMutex handles everything: gets fresh token, refreshes, updates store
      await refreshTokensWithMutex();

      // Get NEW token from store (refresh already updated it)
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        result = await doFetch(newToken);
      }
    } catch {
      clearTokens(); // Refresh failed, force logout
    }
  }

  return result;
}

/**
 * Helper to unwrap ApiResult or throw error.
 */
export async function unwrapAuthResult<T>(
  result: Promise<ApiResult<T>>
): Promise<T> {
  const { data, error } = await result;
  if (error || !data) throw new Error(error ?? "Unknown error");
  return data;
}
