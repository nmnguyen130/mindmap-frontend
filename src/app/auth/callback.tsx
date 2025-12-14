import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { parseAuthTokens } from "@/features/auth/utils/url-utils";

/**
 * OAuth Callback Handler Screen
 * Validates deep link tokens and completes login.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const url = Linking.useLinkingURL();
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleAuth = async () => {
      try {
        const { accessToken, refreshToken } = await parseAuthTokens(
          url,
          params
        );

        if (!accessToken || !refreshToken) {
          // Wait briefly for URL/params to populate if just mounted
          if (!url && Object.keys(params).length === 0) return;
          throw new Error("Unable to verify login details.");
        }

        if (mounted) {
          await handleOAuthCallback.mutateAsync({ accessToken, refreshToken });
          router.replace("/(drawer)");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Auth callback error:", err);
        setError("Sign in failed. Please try again.");
        setTimeout(() => router.replace("/(auth)/login"), 2500);
      }
    };

    handleAuth();
    return () => {
      mounted = false;
    };
  }, [url, params]);

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-8">
        <Text className="text-destructive font-medium text-lg mb-2 text-center">
          {error}
        </Text>
        <Text className="text-muted-foreground text-center">
          Redirecting you back to login...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-background">
      <ActivityIndicator size="large" className="text-primary" />
      <Text className="text-muted-foreground mt-6 text-base font-medium">
        Finalizing sign in...
      </Text>
    </View>
  );
}
