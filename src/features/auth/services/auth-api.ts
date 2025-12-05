import { API_BASE_URL } from "@/constants/config";
import type { User } from "../store/auth-store";

// Auth API helper
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Generic API helper with JSON parsing and error handling
const api = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Request failed");
  }
  return json.data;
};

// Auth API service
export const authApi = {
  // Login with email/password
  login: ({ email, password }: { email: string; password: string }) =>
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as Promise<AuthResponse>,

  // Register new user
  register: ({ email, password }: { email: string; password: string }) =>
    api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as Promise<AuthResponse>,

  // Get current user (requires access token)
  getMe: ({ accessToken }: { accessToken: string }) =>
    api("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }) as Promise<User>,

  // Refresh access token
  refreshTokens: ({ refreshToken }: { refreshToken: string }) =>
    api("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }) as Promise<{ access_token: string; refresh_token: string }>,

  // Logout (server-side)
  logout: () => api("/api/auth/logout", { method: "POST" }).catch(() => { }),

  // Request password reset email
  forgotPassword: ({ email }: { email: string }) =>
    api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Reset password with token
  resetPassword: ({
    accessToken,
    password,
  }: {
    accessToken: string;
    password: string;
  }) =>
    api("/api/auth/reset-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
    }),

  // Initiate social login
  socialLogin: ({ provider }: { provider: "google" | "facebook" }) =>
    api(`/api/auth/social/${provider}`, {
      method: "POST",
    }) as Promise<{ url: string }>,

  // Handle OAuth callback and fetch user
  handleOAuthCallback: async ({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string;
  }): Promise<AuthResponse> => {
    const user = await authApi.getMe({ accessToken });
    return { access_token: accessToken, refresh_token: refreshToken, user };
  },
};
