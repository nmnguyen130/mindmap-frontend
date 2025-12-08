import * as Linking from "expo-linking";

interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Parsed OAuth tokens from deep link URL
 */
export async function parseAuthTokens(
  url: string | null,
  params: Record<string, string | string[] | undefined>
): Promise<AuthTokens> {
  // 1. Resolve URL (priority: explicit url > initial url)
  const deepLink = url || (await Linking.getInitialURL());
  if (!deepLink) return {};

  // 2. Try query params first (standard)
  let accessToken: string | undefined =
    typeof params.access_token === "string"
      ? params.access_token
      : params.access_token?.[0];
  let refreshToken: string | undefined =
    typeof params.refresh_token === "string"
      ? params.refresh_token
      : params.refresh_token?.[0];

  // 3. Fallback to hash params (Supabase behavior)
  if ((!accessToken || !refreshToken) && deepLink.includes("#")) {
    const hashParams = new URLSearchParams(deepLink.split("#")[1]);
    accessToken = hashParams.get("access_token") || undefined;
    refreshToken = hashParams.get("refresh_token") || undefined;
  }

  return { accessToken, refreshToken };
}
