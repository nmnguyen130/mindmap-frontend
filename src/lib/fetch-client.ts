import { API_BASE_URL } from "@/constants/config";

/**
 * Standardized API response format.
 * All API calls return this shape for consistent error handling.
 */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Generic API client with standardized response format.
 * Returns { data, error, status } for all requests.
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        data: null,
        error: json.message || "Request failed",
        status: response.status,
      };
    }

    return { data: json.data as T, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}

/**
 * Helper to unwrap ApiResult or throw error.
 * Use with React Query mutations that expect Promise<T>.
 */
export async function unwrapResult<T>(
  result: Promise<ApiResult<T>>
): Promise<T> {
  const { data, error } = await result;
  if (error || !data) throw new Error(error || "Unknown error");
  return data;
}

/**
 * Create an authenticated API request with Bearer token.
 */
export function authHeader(accessToken: string): RequestInit {
  return {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}
