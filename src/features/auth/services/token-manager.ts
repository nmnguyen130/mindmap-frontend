import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEYS } from '@/constants/config';

// ============================================================================
// Token Manager Service
// ============================================================================

/**
 * Save access and refresh tokens to secure storage
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
}

/**
 * Get access token from secure storage
 */
export async function getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Get refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Clear all tokens from secure storage
 */
export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
}
