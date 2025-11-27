import * as SecureStore from 'expo-secure-store';
import { useMutation } from '@tanstack/react-query';
import { create } from 'zustand';

import { API_BASE_URL, TOKEN_KEYS } from '@/constants/config';
import { useAuthStore } from '@/stores/auth';

// Types
interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
    };
}

interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    email: string;
    password: string;
}

// API calls
const authApi = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(error.message || 'Invalid email or password');
        }

        const result = await response.json();
        return result.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(error.message || 'Registration failed');
        }

        const result = await response.json();
        return result.data;
    },

    getCurrentUser: async (accessToken: string) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error('Failed to get user');
        }

        const result = await response.json();
        return result.data;
    },
};

// Token management
const tokenManager = {
    saveTokens: async (accessToken: string, refreshToken: string) => {
        await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
    },

    getAccessToken: async () => {
        return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    },

    getRefreshToken: async () => {
        return await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
    },

    clearTokens: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
    },
};

// Hooks
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
