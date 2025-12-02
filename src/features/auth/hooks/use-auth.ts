import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import * as authApi from '../services/auth-api';
import * as tokenManager from '../services/token-manager';

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
 * Hook for forgot password request
 */
export const useForgotPassword = () => {
    return useMutation({
        mutationFn: authApi.forgotPassword,
    });
};

/**
 * Hook for password reset
 */
export const useResetPassword = () => {
    return useMutation({
        mutationFn: ({ accessToken, password }: { accessToken: string; password: string }) =>
            authApi.resetPassword(accessToken, password),
    });
};

/**
 * Hook for social login (Google or Facebook)
 */
export const useSocialLogin = () => {
    return useMutation({
        mutationFn: authApi.socialLogin,
    });
};

/**
 * Hook for handling OAuth callback
 */
export const useHandleOAuthCallback = () => {
    const { setUser, setTokens } = useAuthStore();

    return useMutation({
        mutationFn: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) =>
            authApi.handleOAuthCallback(accessToken, refreshToken),
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
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            await tokenManager.clearTokens();
            store.logout();
        }
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
