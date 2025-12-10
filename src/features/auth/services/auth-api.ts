import { fetchApi, unwrapResult } from "@/lib/fetch-client";

// Types
export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

// Re-export for convenience
export type { ApiResult } from "@/lib/fetch-client";

// Auth API service
export const authApi = {
  login: ({ email, password }: { email: string; password: string }) =>
    unwrapResult(
      fetchApi<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    ),

  register: ({ email, password }: { email: string; password: string }) =>
    unwrapResult(
      fetchApi<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    ),

  getMe: ({ accessToken }: { accessToken: string }) =>
    unwrapResult(
      fetchApi<User>("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ),

  refreshTokens: ({ refreshToken }: { refreshToken: string }) =>
    unwrapResult(
      fetchApi<TokenResponse>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    ),

  logout: () =>
    fetchApi("/api/auth/logout", { method: "POST" }).catch(() => {}),

  forgotPassword: ({ email }: { email: string }) =>
    unwrapResult(
      fetchApi("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
    ),

  resetPassword: ({
    accessToken,
    password,
  }: {
    accessToken: string;
    password: string;
  }) =>
    unwrapResult(
      fetchApi("/api/auth/reset-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ password }),
      })
    ),

  socialLogin: ({ provider }: { provider: "google" | "facebook" }) =>
    unwrapResult(
      fetchApi<{ url: string }>(`/api/auth/social/${provider}`, {
        method: "POST",
      })
    ),

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
