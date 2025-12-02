import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useHandleOAuthCallback } from '@/features/auth/hooks/use-auth';

/**
 * OAuth Callback Handler Screen
 * 
 * This screen handles the deep link callback from OAuth providers (Google/Facebook).
 * URL format: mindflow://auth/callback#access_token=xxx&refresh_token=yyy
 */
export default function AuthCallbackScreen() {
    const params = useLocalSearchParams();
    const url = Linking.useLinkingURL();
    const router = useRouter();
    const handleCallback = useHandleOAuthCallback();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuth = async () => {
            try {
                // 1. Resolve URL (Hook or Initial)
                const deepLink = url || (await Linking.getInitialURL());
                if (!deepLink) return; // Wait for URL to be available

                // 2. Extract Tokens (Priority: Hash > Query Params)
                let accessToken: string | undefined = typeof params.access_token === 'string' ? params.access_token : params.access_token?.[0];
                let refreshToken: string | undefined = typeof params.refresh_token === 'string' ? params.refresh_token : params.refresh_token?.[0];

                // If not in query params, check URL hash (Supabase default)
                if ((!accessToken || !refreshToken) && deepLink.includes('#')) {
                    const hashParams = new URLSearchParams(deepLink.split('#')[1]);
                    accessToken = hashParams.get('access_token') || undefined;
                    refreshToken = hashParams.get('refresh_token') || undefined;
                }

                // 3. Validate & Execute
                if (!accessToken || !refreshToken) {
                    throw new Error('Missing authentication tokens');
                }

                await handleCallback.mutateAsync({ accessToken, refreshToken });
                router.replace('/(drawer)');

            } catch (err) {
                console.error('Auth callback error:', err);
                setError(err instanceof Error ? err.message : 'Authentication failed');
                setTimeout(() => router.replace('/(auth)/login'), 2000);
            }
        };

        handleAuth();
    }, [url, params]);

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-background px-6">
                <Text className="text-red-500 text-lg mb-4">❌ {error}</Text>
                <Text className="text-muted-foreground">Redirecting to login...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 justify-center items-center bg-background">
            <ActivityIndicator size="large" color="#007AFF" />
            <Text className="text-foreground mt-4 text-lg">Completing sign in...</Text>
        </View>
    );
}
