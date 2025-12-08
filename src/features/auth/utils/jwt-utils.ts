export interface JWTPayload {
  sub: string; // user_id
  email?: string;
  exp: number; // expiry timestamp (seconds)
  iat?: number; // issued at
}

/**
 * Decode JWT payload without verification.
 * Server-side validation still occurs on each API request.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    // Base64URL decode
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if JWT is expired (with buffer for clock skew)
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp - bufferSeconds;
}

/**
 * Extract user from JWT payload
 */
export function getUserFromToken(
  token: string
): { id: string; email: string } | null {
  const payload = decodeJWT(token);
  if (!payload?.sub) return null;

  return {
    id: payload.sub,
    email: payload.email || "",
  };
}
