import { API_BASE_URL } from '@/constants/config';

// ============================================================================
// Types
// ============================================================================

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
    };
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface User {
    id: string;
    email: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

// ============================================================================
// Auth API Service
// ============================================================================

/**
 * Login user with email and password
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
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
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
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
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to get user');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Request password reset email
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send reset email' }));
        throw new Error(error.message || 'Failed to send reset email');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Reset password with token from email link
 */
export async function resetPassword(accessToken: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
        throw new Error(error.message || 'Failed to reset password');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Initiate social login (Google or Facebook)
 */
export async function socialLogin(provider: 'google' | 'facebook'): Promise<{ url: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/social/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Failed to initiate ${provider} login` }));
        throw new Error(error.message || `Failed to initiate ${provider} login`);
    }

    const result = await response.json();
    return result.data;
}

/**
 * Handle OAuth callback - Process tokens from OAuth redirect
 */
export async function handleOAuthCallback(accessToken: string, refreshToken: string): Promise<AuthResponse> {
    // The OAuth flow already provides us with valid tokens from the backend
    // We just need to fetch the user info with the access token
    const user = await getCurrentUser(accessToken);

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user,
    };
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        // We don't throw here because we want to allow local logout even if server fails
        console.warn('Server logout failed');
    }
}
