import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/features/auth";
import { useTheme } from "@/components/providers/theme-provider";
import { useStatusModal } from "@/components/providers/modal-provider";
import FormScreen from "@/components/ui/form-screen";
import ThemedTextInput from "@/components/ui/text-input";
import ActionButton from "@/components/ui/action-button";
import SocialButton from "@/components/ui/social-button";
import Divider from "@/components/ui/divider";

// Set up WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { colors } = useTheme();
  const { showStatusModal } = useStatusModal();
  const { login, socialLogin } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showStatusModal({
        type: "error",
        title: "Error",
        message: "Please enter both email and password",
      });
      return;
    }

    try {
      await login.mutateAsync({ email: email.trim(), password });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      showStatusModal({
        type: "error",
        title: "Login Failed",
        message,
      });
    }
  };

  const handleSocialLogin = async ({
    provider,
  }: {
    provider: "google" | "facebook";
  }) => {
    try {
      // Get OAuth URL from backend
      const result = await socialLogin.mutateAsync({ provider });

      if (!result.url) {
        throw new Error("Failed to get OAuth URL");
      }

      // Open OAuth URL in WebBrowser
      // The callback will be handled by app/auth/callback.tsx via deep linking
      await WebBrowser.openAuthSessionAsync(
        result.url,
        "mindflow://auth/callback"
      );
    } catch (error) {
      console.error("Social login error:", error);
      showStatusModal({
        type: "error",
        title: `${provider === "google" ? "Google" : "Facebook"} Sign-In Failed`,
        message:
          error instanceof Error ? error.message : "Authentication failed",
      });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FormScreen>
        <View className="flex-1 justify-center">
          {/* Header */}
          <View className="mb-8">
            <Text
              className="text-4xl font-bold mb-2"
              style={{ color: colors.foreground }}
            >
              Welcome Back
            </Text>
            <Text
              className="text-base"
              style={{ color: colors.mutedForeground }}
            >
              Sign in to continue to your mind maps
            </Text>
          </View>

          {/* Form */}
          <View className="mb-4">
            <ThemedTextInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="email"
              editable={!login.isPending}
            />

            <ThemedTextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              leftIcon="lock"
              editable={!login.isPending}
            />

            {/* Forgot Password Link */}
            <View className="flex-row justify-end mt-2">
              <Pressable onPress={() => router.push("/forgot-password" as any)}>
                <Text
                  className="text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  Forgot Password?
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <ActionButton
            title={login.isPending ? "Signing in..." : "Sign In"}
            variant="primary"
            onPress={handleLogin}
            disabled={login.isPending}
          />

          {/* Register Link */}
          <View className="flex-row justify-center items-center mt-6">
            <Text style={{ color: colors.mutedForeground }}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/register" as any)}>
              <Text className="font-semibold" style={{ color: colors.primary }}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          <Divider />

          {/* Google Sign-In */}
          <View className="mb-3">
            <SocialButton
              provider="google"
              onPress={() => handleSocialLogin({ provider: "google" })}
              disabled={login.isPending || socialLogin.isPending}
            />
          </View>

          {/* Facebook Sign-In */}
          <View>
            <SocialButton
              provider="facebook"
              onPress={() => handleSocialLogin({ provider: "facebook" })}
              disabled={login.isPending || socialLogin.isPending}
            />
          </View>
        </View>
      </FormScreen>
    </View>
  );
};

export default LoginScreen;
