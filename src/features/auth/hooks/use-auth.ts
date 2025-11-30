import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import * as authApi from '../services/auth-api';
import * as tokenManager from '../services/token-manager';

// ============================================================================
// React Hooks for Authentication
// ============================================================================

/**
 * Hook for user login
 */
export const useLogin = () => {
    const { setUser, setTokens } = useAuthStore();

    return useMutation({
        mutationFn: authApi.login,
        onSuccess: async (data) => {
            await tokenManager.saveTokens(data.access_token, data.refresh_token);
            setTokens(data.access_token, data.refresh_token);
            setUser(data.user);
        },
    });
};

/**
 * Hook for user registration
 */
export const useRegister = () => {
    const { setUser, setTokens } = useAuthStore();

    return useMutation({
        mutationFn: authApi.register,
        onSuccess: async (data) => {
            await tokenManager.saveTokens(data.access_token, data.refresh_token);
            setTokens(data.access_token, data.refresh_token);
            setUser(data.user);
        },
    });
};

/**
 * Main authentication hook
 */
export const useAuth = () => {
    const store = useAuthStore();

    const logout = async () => {
        await tokenManager.clearTokens();
        store.logout();
    };

    const initializeAuth = async () => {
        try {
            const accessToken = await tokenManager.getAccessToken();
            const refreshToken = await tokenManager.getRefreshToken();

            if (accessToken && refreshToken) {
                const user = await authApi.getCurrentUser(accessToken);
                store.setTokens(accessToken, refreshToken);
                store.setUser(user);
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            await tokenManager.clearTokens();
            store.logout();
        }
    };

    return {
        user: store.user,
        isAuthenticated: store.isAuthenticated,
        logout,
        initializeAuth,
    };
};
